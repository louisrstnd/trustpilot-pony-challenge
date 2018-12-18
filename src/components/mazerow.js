import React, { Component } from 'react';
import Element from './element'

class MazeRow extends Component {
  render() {

  
    return (
      <div className = "row">
    {this.props.walls.map(d => <Element  key={d.key} element={d} ponyState={this.props.ponyState}/>)}
      </div>
     
      
    );
  }
}

export default MazeRow;
