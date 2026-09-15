# Selection Helper

This Mendix widget helps you pre-select one or more items in a list. Works with the datagrid, template grid, and list view.

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Typical usage scenario

From an overview page, you select an item from a list to enter a detail page that also contains a list. This list contains items from the overview page, and certain items should be pre-selected (for example the item selected from the overview page).

For example, consider a list of OrderLine items on an overview page. When I click on an OrderLine, I am presented with a detail page about the whole Order, with the chosen OrderLine preselected in another master-detail list.

## Configuration

![Configuration Sample](https://github.com/tieniber/SelectionHelper/blob/master/assets/SelectionHelper.png)

 1. Place this widget directly below the list widget that should have a pre-selection.
 2. Set the configuration options. You have 3 configuration paradigms to choose from:
  1. Context entity of the widget is preselected in the list. To do this, no configuration is required on the widget.
  2. A single item is pre-selected from a microflow. To do this, set the options "List entity" and "Data Source MF (one)".
  3. Multiple items are pre-selected from a microflow. To do this, set the options "List entity" and "Data Source MF (list)"
