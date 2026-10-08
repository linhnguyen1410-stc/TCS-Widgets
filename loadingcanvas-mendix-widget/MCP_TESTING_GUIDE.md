# Mendix MCP Testing Configuration

This document describes how to use the MCP server to test the Mendix app with the LoadingCanvas widget.

## Quick Start

### 1. Start Mendix Runtime
```bash
# From Mendix Studio Pro: Run the app locally
# Or from command line:
cd D:/Mendix/TCSTransport-main/deployment
java -jar runtime/launcher/runtimelauncher.jar -d .
```

### 2. Verify Runtime is Running
```bash
curl http://localhost:8882/login.html
```

### 3. Access Pages

| Page | URL | Role Required |
|------|-----|---------------|
| Login | http://localhost:8882/login.html | All |
| Home (demo users) | http://localhost:8882/index.html | Demo users |
| Loading Meter Validation | http://localhost:8882/p/LoadingMeter_Validation | Student |
| Truck Selection View 2D | http://localhost:8882/p/TruckSelection_View2D | Student |
| Student Homepage | http://localhost:8882/p/Homepage_Student | Student |

## Test Users

### Student User (can view loading canvas)
- **Username**: `sp_testuser01@edu.stc-r.nl`
- **Password**: `*********`
- **Login Method**: Form submission on `/login.html`
- **Access**: LoadingMeter_Validation, Homepage_Student

### Demo Users (password: `1`)
| User | Role | Login Method |
|------|------|--------------|
| demo_administrator | Administrator | Click link on index.html |
| demo_teacher | TCSTeacher | Click link on index.html |
| demo_functionalManager | FunctionalManager | Click link on index.html |

**Note**: Demo users login via anchor links on index.html, not form submission.

## Testing with MCP Server (Firefox)

### Login as Student
```javascript
// Navigate to login page
await navigate_page({ url: "http://localhost:8882/login.html", wait: "interactive" });

// Fill credentials
await fill_form_by_uid({
  elements: [
    { uid: "USERNAME_INPUT_UID", value: "sp_testuser01@edu.stc-r.nl" },
    { uid: "PASSWORD_INPUT_UID", value: "************" }
  ]
});

// Submit
await click_by_uid({ uid: "SIGNIN_BUTTON_UID" });

// Verify login
await navigate_page({ url: "http://localhost:8882/p/LoadingMeter_Validation", wait: "interactive" });
```

### Login as Demo User
```javascript
// Go to index page
await navigate_page({ url: "http://localhost:8882/index.html", wait: "interactive" });

// Click demo user link
await evaluate_script(() => {
  const links = document.querySelectorAll('a[href="#"]');
  for (const link of links) {
    if (link.textContent.includes('demo_administrator')) {
      link.click();
      return 'clicked';
    }
  }
});
```

## Widget Testing

### Verify Widget Loads
```javascript
await navigate_page({ url: "http://localhost:8882/p/LoadingMeter_Validation", wait: "interactive" });
await take_snapshot({ maxLines: 200 });
// Look for LoadingCanvas widget elements
```

### Test Truck Loading
```javascript
// Navigate to truck selection page
await navigate_page({ url: "http://localhost:8882/p/TruckSelection_View2D", wait: "interactive" });
// Click "View" button for a truck
// Verify loading canvas renders
```

### Expected Truck Frame Measurements (browser check)

The dashed truck frame element must match the selected truck's DB dimensions (`combinationlength` × `combinationwidth` from `datamodelmodule$technicaldetails`):

| Truck | Size (m) | Frame element (px) |
|---|---|---|
| Truck 12T (NL-WG-01) | 10.00 × 2.40 | left 333, top ~42.79, width ~1237.5, height 297 |
| Truck Tautliner | 13.60 × 2.45 | left 333, top ~60.42, width 1453, height ~261.75 |
| Truck 40T | 12.192 × 2.350 | left 333, top ~51.26, width 1453, height ~280.06 |
| Truck and Hanger 40 T | 17.93 × 2.352 | left 333, top ~95.99, width 1453, height ~190.60 |

Rules: fits → scale = 297/W px/m (frame `L×scale` × 297); capped → scale = 1453/L px/m (frame 1453 × `W×scale`); frame x = 333, y = 191.29 − height/2; background `100% auto` + `center top`; cargo shares the truck's scale. Full fleet table: [docs/MENDIX_ENTITY.md](docs/MENDIX_ENTITY.md#truck-rendering-measurements-m--px).

## Database Verification

### Check Truck Technical Details
```sql
SELECT id, nameresource, combinationlength, combinationwidth 
FROM datamodelmodule$technicaldetails 
WHERE combinationlength > 0 OR combinationwidth > 0;
```

### Check Truck Selection Associations
```sql
SELECT t.id, t.truckindex, ri.id as resourceinstance_id, r.id as resource_id, td.id as technicaldetails_id
FROM tcsloadingmeter$truckselection t
LEFT JOIN tcsloadingmeter$truckselection_resourceinstance tri ON t.id = tri.tcsloadingmeter$truckselectionid
LEFT JOIN tcstransportmodule$resourceinstance ri ON tri.tcstransportmodule$resourceinstanceid = ri.id
LEFT JOIN tcstransportmodule$resourceinstance_resource rir ON ri.id = rir.tcstransportmodule$resourceinstanceid
LEFT JOIN datamodelmodule$resource r ON rir.datamodelmodule$resourceid = r.id
LEFT JOIN datamodelmodule$resource_technicaldetails rtd ON r.id = rtd.datamodelmodule$resourceid
LEFT JOIN datamodelmodule$technicaldetails td ON rtd.datamodelmodule$technicaldetailsid = td.id;
```

## Known Limitations

1. **Headless Browser Session**: Mendix requires WebSocket connections for full session - headless browser automation may not maintain proper sessions
2. **Demo User Login**: Only works via anchor links on index.html, not form submission
3. **Session Persistence**: Cookies don't persist well in headless automation
4. **Widget Configuration**: Widget must be placed on a Mendix page with TruckSelection datasource configured

## Troubleshooting

### Widget Not Rendering
- Check browser console for JavaScript errors
- Verify TruckSelection datasource is configured on page
- Check widget configuration in Mendix Studio Pro

### Login Fails
- Verify credentials: `sp_testuser01@edu.stc-r.nl` / `#STCGroup1`
- Check if Mendix runtime is running on port 8882
- Try demo user login via index.html anchor links

### Truck Dimensions Not Loading
- Verify TechnicalDetails table has data
- Check association chain: TruckSelection -> ResourceInstance -> Resource -> TechnicalDetails
- Check Mendix logs for association errors
