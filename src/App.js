import React, { Component } from 'react';

import './App.css';
import MazeRow from './components/mazerow';

const directions = {
  "ArrowUp": "north",
  "ArrowDown": "south",
  "ArrowLeft": "west",
  "ArrowRight": "east",
}

const opposite = {
  "south": "north",
  "north": "south",
  "east": "west",
  "west": "east",
}


class App extends Component {

  constructor() {
    super();
    this.state = {
      mazeId: '',
      width: 0,
      height: 0,
      walls: [[]],
      pony: 0,
      domokun: 0,
      exit: 0,
      exitPath: [],
      directions: [],
      backgroundUrl: '',
      active: true, 
      newWidth: 15,
      newHeight: 15
    }
  }


  componentWillMount() {
    document.addEventListener("keyup", this.moveKey);
  }

 
  createMaze = (event) => {
    let {newWidth, newHeight} = this.state;
  
    console.log(newWidth, newHeight)
    fetch("https://ponychallenge.trustpilot.com/pony-challenge/maze", {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "maze-width": Number(newWidth),
        "maze-height": Number(newHeight),
        "maze-player-name": "Fluttershy",
        "difficulty": 2
      })
    }).then(response => response.json())
      .then(response => {
        this.setState({ mazeId: response.maze_id
                 , backgroundUrl : ''
                 , active: true}
                 , this.refreshMaze
                 );
        console.log("maze", response.maze_id)
      }
      ).catch(err => console.log(err))


  }

  refreshMaze = (event) => {
    if(this.state.mazeId === ''){
      return;
    }

    fetch("https://ponychallenge.trustpilot.com/pony-challenge/maze/" + this.state.mazeId)
    .then(response => response.json())
    .then(response => {
      this.setState({
        walls: response.data
        , width: response.size[0]
        , height: response.size[1]
        , pony: response.pony[0]
        , domokun: response.domokun[0]
        , exit: response["end-point"][0]
        
  
      })
      //console.log(response.data)
    }
    
    ).then(this.findPath)

  }

  autoPlay = () =>{
    
   
    const autoPlayInterval = setInterval(
      () =>{
        
        const {pony, domokun, directions} = this.state;
        let direction = directions[0];

        // handle domokun:
        const nextPosition = this.coordinatesToIndex(this.getNextPosition(pony, directions[0]))
        
        if (this.isDomokunAround(nextPosition)){
          const available = new Set(this.getAvailableDirections(pony));
          available.delete(directions[0]);
          direction = Array.from(available)[0];
          console.log("domokun ahead !! new direction : ", direction)
          
        }

         this.movePoney(direction, autoPlayInterval);
        
 
      }
      , 300
    )

  }
  movePoney = (direction, interval) =>{
   
    fetch("https://ponychallenge.trustpilot.com/pony-challenge/maze/" + this.state.mazeId, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "direction": direction
      })
    }).then(response => response.json())
      .then(response => {
        
        if(response.state !== "active"){
          this.setState({backgroundUrl: "https://ponychallenge.trustpilot.com/" +response["hidden-url"]
                        , active : false},this.refreshMaze)
                       if(interval !== undefined){
                        clearInterval(interval)
                       }
          
         
        }else{
        this.refreshMaze();
        }
      })

   
  }

  moveKey = (event) => {

    if (event.key in directions) {
      
      this.movePoney(directions[event.key])
      
        
    }


  }

  createPath = (start, direction, path, exit, directions) => {

    const possibleDirections = this.getAvailableDirections(start);

    if (start === exit) {
      this.setState({exitPath : path});
      this.setState({directions : directions});
    }
    for (let i in possibleDirections) {
      if (direction === undefined || possibleDirections[i] !== opposite[direction]) {
        const newPosition = this.getNextPosition(start, possibleDirections[i]);
        if (!path.includes(newPosition)) {
          const newPath = [];
          newPath.push(...path);
          newPath.push(newPosition);
          const newDirections = [];
          newDirections.push(...directions);
          newDirections.push(possibleDirections[i]);
          this.createPath(newPosition, possibleDirections[i], newPath, exit, newDirections);
        }
      }
    }


  }


  getAvailableDirections = (pony) => {

    const { walls } = this.state;
    let directions = new Set(["north", "west", "east", "south"]);

    const coords = this.coordinates(pony);

    if (coords[0] === 0) {
      directions.delete("north");
    }

    if (coords[1] === 0) {
      directions.delete("west");
    }

    for (let i in walls[pony]) {
      directions.delete(walls[pony][i])

    }
    if (this.isSouthWall(coords)) {
      directions.delete("south");
    }

    if (this.IsEastWall(coords)) {
      directions.delete("east");
    }


    return Array.from(directions);
  }

  isSouthWall= (coords) => {
    const { walls, height } = this.state;
    if (coords[0] === height - 1) {
      return true;
    }
    const index = this.coordinatesToIndex([coords[0] + 1, coords[1]]);
    if (walls[index].includes("north")) {
      return true;
    }
    return false;
  }

  IsEastWall = (coords) => {
    const { walls, width } = this.state;
    if (coords[1] === width - 1) {
      return true;
    }
    const index = this.coordinatesToIndex([coords[0], coords[1] + 1]);
    if (walls[index].includes("west")) {
      return true;
    }
    return false;
  }

  coordinates = (index) => {
    const width = this.state.width;
    return ([Math.floor(index / width), index % width]);

  }


  coordinatesToIndex = (coord) => {
    const width = this.state.width;
    return coord[0] * width + coord[1];

  }


  isDomokunAround= (index) =>{
    const {domoku} = this.state;
    const coord = this.coordinates(index);
    switch(domoku){
     case this.coordinatesToIndex([coord[0] - 1, coord[1]]):
         return true
    case this.coordinatesToIndex([coord[0] + 1, coord[1]]):
        return true
    case this.coordinatesToIndex([coord[0], coord[1] + 1]):
        return true
    case this.coordinatesToIndex([coord[0], coord[1] - 1]):
        return true

    default :return false;
    }
  

  }


  getNextPosition = (index, move) => {

    const coord = this.coordinates(index);

    switch (move) {
      case "north":
        return this.coordinatesToIndex([coord[0] - 1, coord[1]])
      case "south":
        return this.coordinatesToIndex([coord[0] + 1, coord[1]])
      case "east":
        return this.coordinatesToIndex([coord[0], coord[1] + 1])
      case "west":
        return this.coordinatesToIndex([coord[0], coord[1] - 1])

      default:
        return coord;

    }

  }

  findPath = () => {
    const {pony, exit } = this.state;

    this.createPath(pony, undefined, [pony], exit, []);

  }


  onIdChange = (event) => {
    this.setState({ mazeId: event.target.value })

  }
  onDimChange = (event) =>{
    if (event.target.id === "width"){
      this.setState({newWidth : event.target.value})
    }
    if (event.target.id === "height"){
      this.setState({newHeight : event.target.value})
    }
    console.log(event.target.value)
  }

  render() {
    const rows = [];
    let i;
    let j = 0;
    let id = 0;
    const height = this.state.height;
    const width = this.state.width;
    
 
    for (i = 0; i < height; i++) {
      const row = []
      for (j = 0; j < width; j++) {
        const element = {};
        element["key"] = id;
        element["walls"] = this.state.walls[id];
        element["isPony"] = id === this.state.pony ? true : false;
        element["isDomokun"] = id === this.state.domokun ? true : false;
        element["isExit"] = id === this.state.exit ? true : false;
        element["isExitPath"] = this.state.exitPath.includes(id) ? true: false;
        element["height"] = this.state.height;
        if (i === height - 1) {
          element["walls"].push("south");
        }
        if (j === width - 1) {
          element["walls"].push("east");
        }
  

        row.push(element);
        id++;
      }
      rows.push(row);
    }



    return (
      <div>
        <header className="bg-black-40 w-100 pv3 ph4-m ph5-l pa4">
        <nav className="f6 fw6  tracked" >
        <div className="measure">
        <label htmlFor="width" className="select-label db mb2 pr3">Select maze width</label>
        <select id="width"  onChange={this.onDimChange}>
    <option value="15">15</option>
    <option value="20">20</option>
    <option value="25">25</option>
      </select>
      </div>
      <div className="measure">
      <label htmlFor="height" className="select-label db mb2 pr3">Select maze height</label>
        <select id="height"  onChange={this.onDimChange}>
    <option value="15">15</option>
    <option value="20">20</option>
    <option value="25">25</option>
      </select>
      </div>
        <button className="f6 link dim br2 ph3 pv2 mb2 dib white bg-hot-pink" onClick={this.createMaze}>Create new Maze</button>
         <button className="f6 link dim br2 ph3 pv2 mb2 dib white bg-hot-pink" id="autoplay" onClick={this.autoPlay}> auto play</button>
        <label><span className="normal black-60"> Use keyboard arrows to move the pony or click autoplay !</span></label>
        </nav>
        </header>
        <div className="container pa4" style={{backgroundImage : `url(${this.state.backgroundUrl})`
                                         , backgroundRepeat : "no-repeat"
                                          , backgroundSize : "contain" }}>
          {rows.map((d,i) => <MazeRow key={i} walls={d} />)}
        </div>



      </div>


    );
  }
}

export default App;
