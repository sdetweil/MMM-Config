  const emptyString=""
  const LeftID='L'
  const RightID='R'
  const CommonID='C'

JSONForm.fieldTypes['pair'] = {
  // The template describes the HTML that the field will generate.
  // It uses Underscore.js templates.
  template: '<div><div id="<%=node.id%>"><input id="'+LeftID+'" labelfor="item" type="text" value="<%=from%>">&colon;<input id="'+RightID+'" type="text" value="<%=to%>""><input id="'+CommonID+'" type="hidden" name="<%=schemaname%>" value="<%=initvalue%>"></div></div>',

  // Set the inputfield flag when the field is a real input field
  // that produces a value. Set the array flag when it creates an
  // array of fields. Both flags are mutually exclusive.
  // Do not set any of these flags for containers and other types
  // of fields.
  inputfield: true ,
  array: false ,

  // Most real input fields should set this flag that wraps the
  // generated content into the HTML code needed to report errors
  fieldtemplate: true ,

  // Return the root element created by the field
  // (el is the DOM element whose id is node.id,
  // this function is only useful when el is not the root
  // element in the field's template)
  getElement: function (el) {
    // Adjust the following based on your template. In this example
    // there is an additional <div> so we need to go one level up.
    let x = $(el).parent().get(0);
    return x;
  },
  // this is just to validate  the data on submit
  onSubmit: function(evt, elt){

    let left_value = 0
    // get the value of the left field
    left_value=$(elt.el).find('#'+LeftID).val()
   // console.log( "value="+y)
   // it can't be empty
    if(left_value==emptyString){
      alert("definition for "+elt.el.firstChild.innerText+" cannot be empty")
    }
    return left_value!==emptyString
  },
  // This is where you can complete the data that will be used
  // to run the template string
  onBeforeRender: function (data, node) {
  	//console.log("in before")
    data.schemaname= node.name
    if(node.value !== undefined){
      let key
      // remove all the 'object' type delimiters
      data.initvalue=JSON.stringify(node.value).replace(/["|{|}"]/g,'')

      node.name=""
      if(Array.isArray(node.value) || typeof node.value =='string'){
        key=  data.initvalue.split(':')
        data.from = key[0]
        data.to   = key[1]
      } else {
        key = Object.keys(node.value)
      	data.from = key[0]
      	data.to   = node.value[key[0]]
      }
    } else {
      data.from = emptyString
      data.to   = emptyString
      data.schemaname= node.name
      data.initvalue   = emptyString
    }
  },

  // This is where you can enhance the generated HTML by adding
  // event handlers if needed
 onInsert: function (evt, node) {
    // construct the value of the hidden field from the 2 shown fields,
    // the shown fields are not in the submit field list  because they have no 'name=' property
    $(node.el).change(function (element) {
      let id=0
      let values={}
      // get our field value (could be left or right field)
      values[id=element.target.id] =element.target.value
      // get our parent node
      let parent = element.target.parentElement
      // find the other field and save ITS value too
      values[id==RightID?LeftID:RightID] = $(parent).find('#'+(id==RightID?LeftID:RightID)).val()
      // set the field that will be returned on submit
      $(parent).find('#'+CommonID).val(values[LeftID]+':'+values[RightID])
    });
  }
};
