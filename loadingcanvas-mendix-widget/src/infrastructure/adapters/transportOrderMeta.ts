import { isMendixRuntime, getObjectGuid } from "../mendix/mendixRuntime";
import { getReferenceGuids } from "../mendix/mendixAssociations";
import { loadMendixObjects } from "../mendix/mendixLoaders";
import { toPlainObject } from "../mendix/mendixMappers";
import {
  TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS,
  TRANSPORT_ORDER_PRODUCER_ASSOCIATIONS,
  TRANSPORT_ORDER_COMPANY_FROM_ASSOCIATIONS,
  TRANSPORT_ORDER_COMPANY_TO_ASSOCIATIONS,
} from "../mendix/mendixSchema";

export interface TransportOrderMeta {
  transportOrderNo?: string;
  productName?: string;
  producerName?: string; // TransportOrder -> Producer (Company.Name)
  companyFromName?: string; // TransportOrder -> Company_From (Company.Name)
  companyToName?: string; // TransportOrder -> Company_To (Company.Name)
}

// Per-order GUID bundles collected in the first pass, keyed by order GUID.
interface OrderReferenceGuids {
  productGuids: string[];
  producerGuids: string[];
  fromGuids: string[];
  toGuids: string[];
}

const readName = (plain: Record<string, unknown>): string | undefined => {
  const name = String(plain.Name ?? plain.name ?? "").trim();
  return name || undefined;
};

const resolveFirstName = (guids: string[], namesByGuid: Map<string, string>): string | undefined =>
  guids.map((g) => namesByGuid.get(g)).find(Boolean);

// Builds TransportOrderNo + Product name + Company names (Producer/From/To)
// metadata keyed by TransportOrder GUID. Product and Company references are read
// from already-loaded order objects; the referenced entities are batch-loaded once
// per entity type (Company covers all three popup roles).
export const buildTransportOrderMeta = async (rawOrders: unknown[]): Promise<Map<string, TransportOrderMeta>> => {
  const metaByOrderGuid = new Map<string, TransportOrderMeta>();
  const guidsByOrderGuid = new Map<string, OrderReferenceGuids>();
  const ordersWithMissingMeta: string[] = [];

  for (const raw of rawOrders) {
    const orderGuid = getObjectGuid(raw);
    if (!orderGuid) {
      continue;
    }
    const plain = toPlainObject(raw);
    const transportOrderNo = String(plain.TransportOrderNo ?? plain.transportOrderNo ?? "").trim();

    const productGuids = getReferenceGuids(raw, TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS);
    const producerGuids = getReferenceGuids(raw, TRANSPORT_ORDER_PRODUCER_ASSOCIATIONS);
    const fromGuids = getReferenceGuids(raw, TRANSPORT_ORDER_COMPANY_FROM_ASSOCIATIONS);
    const toGuids = getReferenceGuids(raw, TRANSPORT_ORDER_COMPANY_TO_ASSOCIATIONS);

    if (isMendixRuntime() && [productGuids, producerGuids, fromGuids, toGuids].some((g) => g.length === 0)) {
      ordersWithMissingMeta.push(orderGuid);
    }

    guidsByOrderGuid.set(orderGuid, { productGuids, producerGuids, fromGuids, toGuids });
    metaByOrderGuid.set(orderGuid, { transportOrderNo: transportOrderNo || undefined });
  }

  if (ordersWithMissingMeta.length > 0 && isMendixRuntime()) {
    console.warn(
      `buildTransportOrderMeta: ${ordersWithMissingMeta.length}/${rawOrders.length} TransportOrders miss a Product/Producer/Company_From/Company_To reference (tried: ${[
        "Product",
        ...TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS,
        "Producer",
        ...TRANSPORT_ORDER_PRODUCER_ASSOCIATIONS,
        "Company_From",
        ...TRANSPORT_ORDER_COMPANY_FROM_ASSOCIATIONS,
        "Company_To",
        ...TRANSPORT_ORDER_COMPANY_TO_ASSOCIATIONS,
      ].join(", ")}); popup fields will be missing`
    );
  }

  const productNamesByGuid = new Map<string, string>();
  const allProductGuids = [...new Set([...guidsByOrderGuid.values()].flatMap((g) => g.productGuids))];
  const allCompanyGuids = [
    ...new Set([...guidsByOrderGuid.values()].flatMap((g) => [...g.producerGuids, ...g.fromGuids, ...g.toGuids])),
  ];

  // PARALLEL: load products and companies simultaneously
  const [productObjects, companyObjects] = await Promise.all([
    allProductGuids.length > 0 ? loadMendixObjects(allProductGuids) : Promise.resolve([]),
    allCompanyGuids.length > 0 ? loadMendixObjects(allCompanyGuids) : Promise.resolve([]),
  ]);

  for (const productObj of productObjects) {
    const productGuid = getObjectGuid(productObj);
    if (!productGuid) {
      continue;
    }
    const name = readName(toPlainObject(productObj));
    if (name) {
      productNamesByGuid.set(productGuid, name);
    } else if (isMendixRuntime()) {
      console.warn(`buildTransportOrderMeta: Product ${productGuid} loaded but has no readable Name attribute`);
    }
  }

  const companyNamesByGuid = new Map<string, string>();
  for (const companyObj of companyObjects) {
    const companyGuid = getObjectGuid(companyObj);
    if (!companyGuid) {
      continue;
    }
    const name = readName(toPlainObject(companyObj));
    if (name) {
      companyNamesByGuid.set(companyGuid, name);
    } else if (isMendixRuntime()) {
      console.warn(`buildTransportOrderMeta: Company ${companyGuid} loaded but has no readable Name attribute`);
    }
  }

  for (const [orderGuid, guids] of guidsByOrderGuid) {
    const meta = metaByOrderGuid.get(orderGuid) ?? {};
    metaByOrderGuid.set(orderGuid, {
      transportOrderNo: meta.transportOrderNo,
      productName: resolveFirstName(guids.productGuids, productNamesByGuid),
      producerName: resolveFirstName(guids.producerGuids, companyNamesByGuid),
      companyFromName: resolveFirstName(guids.fromGuids, companyNamesByGuid),
      companyToName: resolveFirstName(guids.toGuids, companyNamesByGuid),
    });
  }

  return metaByOrderGuid;
};
