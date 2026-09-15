# PrintScreen

A Mendix widget to grab an element (or the whole screen) and write it to a PDF.

This widget works by creating a screenshot of the specified target div and laying it onto a PDF. This happens 100% client side.

## Typical Usage

A user wants a local copy of an on-screen page. Instead of building a document template trying to mimic the exact on-screen page, you can provide a "download" button using this widget to generate a PDF and download it to the user's machine.

## Configuration

 1. This widget renders a button on the page, so place it where you want the button.
 2. Configure the widget

Options:
 - Page Orientation: choose a portrait or landscape orientation
 - Processing Type: choose to process as JPEG or PNG
 - Class of area to print: The class added to the container of the area to be printed. This way you can print only a certain pane on the screen (e.g. to ignore menus). The chosen frame will be printed at its full height on multiple pages. Note: this can be used like a CSS selector, except that the widget will add a dot to the front of your selector (e.g.: scrollContent > .mx-scrollcontainer-wrapper). See the test project for an example.
 - Button Text: the label of the button rendered by the widget
 - Filename Prefix: The prefix of the filename. A timestamp will be added along with the appropriate file extension.

### Configuration Screenshot
 ![Configuration Sample](https://github.com/tieniber/PrintScreen/blob/master/assets/PrintScreenConfig.png)
