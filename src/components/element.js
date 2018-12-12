import React, { Component } from 'react';




class Element extends Component {

    render() {

        const {walls, isPony, isDomokun, isExit, isExitPath} = this.props.element;
        const elementStyle = {};

        const elementClass = ["element"];

        for (let wall in walls){
            elementClass.push(walls[wall]);
        }
        if (isPony) {
            elementClass.push("pony");
        }
        if(isDomokun){
            elementClass.push("domokun");
        }
        if(isExitPath){
            elementClass.push("exitPath");
        }
        if(isExit){
            elementClass.push("exit");
        }
        
         
     const h =  75 / this.props.element.height
      elementStyle["height"] = h + "vh"
      elementStyle["width"] = h + "vh"

    return (

      <div className ={elementClass.join(" ")} style={elementStyle}>
        {isExitPath ? "." : ""
        }
       </div>
      
    );
  }
}

export default Element;
