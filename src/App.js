import React, { Component } from 'react';

import './App.css';
import MazeRow from './components/mazerow';
import arrow from './arrows.png';

const KEYMPAP = {
  "ArrowUp": "north",
  "ArrowDown": "south",
  "ArrowLeft": "west",
  "ArrowRight": "east",
}

const DIRECTIONS = ["north", "south", "west", "east"];

const API = {
  "root": "https://ponychallenge.trustpilot.com",
  "create": "https://ponychallenge.trustpilot.com/pony-challenge/maze",
  "maze": "https://ponychallenge.trustpilot.com/pony-challenge/maze/"
}

const OPPOSITE = {
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
      walls: [],
      pony: 0,
      domokun: 0,
      exit: 0,
      exitPath: [],
      directions: [],
      backgroundUrl: '',
      active: true,
      newWidth: 15,
      newHeight: 15,
      auto: false,
      difficulty: 5
    }
  }


  componentWillMount() {
    document.addEventListener("keyup", this.moveKey);
  }


  createMaze = (event) => {
    let { newWidth, newHeight } = this.state;


    fetch(API.create, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "maze-width": Number(newWidth),
        "maze-height": Number(newHeight),
        "maze-player-name": "Fluttershy",
        "difficulty": this.state.difficulty
      })
    }).then(response => response.json())
      .then(response => {
        this.setState({
          mazeId: response.maze_id
          , backgroundUrl: ''
          , active: true
          , auto: false
        }
          , this.refreshMaze
        );
        console.log("maze id : ", response.maze_id)
      }).catch(err => console.log(err))
  }

  refreshMaze = () => {
    if (this.state.mazeId === '') {
      return;
    }

    fetch(API.maze + this.state.mazeId)
      .then(response => response.json())
      .then(response => {
        this.setState({
          walls: response.data
          , width: response.size[0]
          , height: response.size[1]
          , pony: response.pony[0]
          , domokun: response.domokun[0]
          , exit: response["end-point"][0]

        }, this.findPath)
      })
  }

  findPath = () => {
    const { pony, exit } = this.state;

    this.createPath(pony, undefined, [pony], exit, []);

  }


  /**
   * method attached to autoplay button
   * set "auto" state to true then initiate first movement with "movePony"
   */
  autoPlay = () => {
    if (this.state.auto) {
      this.setState({ auto: false });
      return;
    }
    this.setState({ auto: true }, this.movePony)

  }

  /**
   * make the pony move one step
   */
  movePony = (direction = '') => {
    const { directions, active, pony } = this.state;
    // make sure the current game is not finished
    if (!active) {
      return;
    }
    // if no direction is specified i.e auto play mode then take the first direction from the calculated exit path
    if (direction === '') {
      direction = directions[0];

      // check if the monster isn't far away
      if (this.isDomokunAhead()) {
        console.log("warning ! domokun ahead !")
        // The monster can't get you if you don't move, so make an impossible move and wait...
        const available = this.getAvailableDirections(pony);
        direction = DIRECTIONS.filter(d => !available.includes(d))[0];
      }

    }
    // API call to make the chosen move
    fetch(API.maze + this.state.mazeId, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "direction": direction
      })
    }).then(response => response.json())
      .then(response => {
        // if the game is over, then fetch the background image
        if (response.state !== "active") {
          this.setState({
            backgroundUrl: API.root + response["hidden-url"]
            , active: false
            , auto: false
          }
            , this.refreshMaze);
        }
        else {
          // get the new maze state
          this.refreshMaze();
        }
      })
  }



  /**
   *  method for manual move
   *  */
  moveKey = (event) => {

    if (event.key in KEYMPAP) {
      // pauses autoplay if it was on
      this.setState({ auto: false }, this.movePony(KEYMPAP[event.key]));
    }
  }


  /**
   * Calculates the path to exit :
   * Explores all the possible paths from the starting point until no move is possible 
   * or the exit is reached
   */
  createPath = (start, move, path, exit, directions) => {
    const { auto, active } = this.state;
    const availableDirections = this.getAvailableDirections(start);

    // if exit is found then set the current path as state exitPath
    if (start === exit) {

      if (auto && active) {
        // if autoplay is on, then update state and trigger next auto move
        this.setState({
          exitPath: path
          , directions: directions
        }
          , this.movePony);
      }
      else {
        // otherwise, just update the state
        this.setState({
          exitPath: path
          , directions: directions
        })
      }
    }

    // explore the possible paths
    for (let i in availableDirections) {
      if (move === undefined || availableDirections[i] !== OPPOSITE[move]) {
        const newPosition = this.getNextPosition(start, availableDirections[i]);
        if (!path.includes(newPosition)) {
          //if we're not going backwards, then add the new position to the path and proceed
          const newPath = [];
          const newDirections = [];
          newPath.push(...path);
          newPath.push(newPosition);
          newDirections.push(...directions);
          newDirections.push(availableDirections[i]);
          this.createPath(newPosition, availableDirections[i], newPath, exit, newDirections);
        }
      }
    }
  }

  /**
   * gets all available directions from a given index (ie directions 
   * that are not blocked by a wall)
   */
  getAvailableDirections = (pony) => {

    const { walls } = this.state;
    let directions = new Set(DIRECTIONS);

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

  isSouthWall = (coords) => {
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


  isDomokunAhead = () => {
    const { domokun, exitPath } = this.state;
    const distance = exitPath.indexOf(domokun);
    if (distance > -1 && distance < 3) {
      return true;
    }

    const coord = this.coordinates(exitPath[1]);
    const indexes = [];
    indexes.push(this.coordinatesToIndex([coord[0] - 1, coord[1]]))
    indexes.push(this.coordinatesToIndex([coord[0] + 1, coord[1]]))
    indexes.push(this.coordinatesToIndex([coord[0], coord[1] - 1]))
    indexes.push(this.coordinatesToIndex([coord[0], coord[1] + 1]))
    if (indexes.includes(domokun)) {
      return true;
    }

    return false;

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


  onLevelChange = (event) => {
    this.setState({ difficulty: Number(event.target.value) })

  }

  onIdChange = (event) => {
    this.setState({ mazeId: event.target.value })

  }
  onDimChange = (event) => {
    if (event.target.id === "width") {
      this.setState({ newWidth: event.target.value })
    }
    if (event.target.id === "height") {
      this.setState({ newHeight: event.target.value })
    }

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
        element["isExitPath"] = this.state.exitPath.includes(id) ? true : false;
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
        <header className="bg-black-50 w-100 ph4-m ph5-l pa2">
          <nav className="f6 tracked" >
            <div className="measure pr3">
              <label htmlFor="difficulty" className="select-label db mb2 pr1 normal">Difficulty : <strong> {this.state.difficulty}</strong> </label>
              <input id='difficulty' type="range" name="points" min="0" max="10" defaultValue="5" onChange={this.onLevelChange} />
            </div>
            <div className="measure pr3">
              <label htmlFor="width" className="select-label db mb2 pr1">Width : {this.state.newWidth}</label>
              <input id='width' type="range" name="points" min="15" max="25" defaultValue="15" step="5" onChange={this.onDimChange} />

            </div>
            <div className="measure pr3">
              <label htmlFor="height" className="select-label db mb2 pr1">Height : {this.state.newHeight}</label>
              <input id='height' type="range" name="points" min="15" max="25" defaultValue="15" step="5" onChange={this.onDimChange} />
            </div>
            <div>
              <button className="f6 link dim br2 ph3 pv1 mr2 mb2 mt2 dib white buttons"
                onClick={this.createMaze}>Create Maze</button>

              <button className="f6 link dim br2 ph3 pv1 mb2 mr2 mt2 dib white buttons" id="autoplay"
                onClick={this.autoPlay}> Auto play</button>
            </div>
              <label ><span className="normal black-60 ">
             Use <img className="key-img" src={arrow} alt="arrows" height="35rem" /> to move the pony or click autoplay !
                 </span>
              </label>
          </nav>
        </header>
        
        <div className="container pa4 flex-auto" style={{
          backgroundImage: `url(${this.state.backgroundUrl})`
          , backgroundRepeat: "no-repeat"
          , backgroundSize: "contain"
        }}>
          {rows.map((d, i) => <MazeRow key={i} walls={d} />)}
        </div>

      </div>

    );
  }
}

export default App;
