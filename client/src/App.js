import React, { Component } from "react";

import io from "socket.io-client";
import "./App.css"

let socket;
if (process.env.NODE_ENV === 'development') {
  socket = io(`http://localhost:3001/`);
} else {
  socket = io();
}

class App extends Component {
  constructor() {
    super()
    this.state = {
      response: false,
      socket: false,
      currentRoom: null,
      roomToJoin: null,
      username: null,
      color: '#7c1313',
      statusArr: [],
      conToHost: false,
      conToServer: false,
      status: 'lobby',
      statusMessage: 'Searching for server...',
      answers: []
    }
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleAnswer = this.handleAnswer.bind(this)
  }

  componentDidMount() {
    
    socket.on('connect', (socket) => {
      this.setState({
        conToServer: true,
        status: 'lobby',
        statusMessage: 'Enter Room Key:'
      })
    })

    // can't get this to recieve for some reason
    socket.on('status', (data) => {
      this.setState({
        status: data.status,
        statusMessage: data.statusMessage
      })

      if (data.status == 'question') {
        this.setState({
          answers: data.answers
        })
      }
    })

    socket.on('disconnectedHost', (data) => {
      this.setState({ statusArr: [], conToHost: false, status: 'The host has stopped hosting!' });
    })
   
  
  }

  componentWillUnmount() {
    this.props.socket.emit('removeUser', {room: this.state.currentRoom, msg: `removeUser`});
    this.setState({ statusArr: [], conToHost: false });
  }

  handleChange(event) {
    this.setState({
        [event.target.name]: event.target.value
    })
  }

  handleSubmit(event) {
      event.preventDefault()
      if(this.state.conToServer) {
        socket.emit('joinRoom', {
          roomName: this.state.roomToJoin, 
          username: this.state.username,
          color: this.state.color
        });
      } 
  }

  handleAnswer(event) {
    event.preventDefault()
      socket.emit('playerAnswer', {
        roomName: this.state.roomToJoin, 
        username: this.state.username,
        answer: event.target.dataset.answer
      });

      this.setState({
        status: 'wait',
        statusMessage: 'Your answer has been recorded!'
      })
  }
  

  
  render() {
    
    return (
      
      <div className="App">
        <div className="container">


        {(() => {
        switch (this.state.status) {



          case 'lobby':
            return (
      
              <div>
              <h4>Trivia City!</h4>
      
                  <form className="form-horizontal">
                    <div className="form-group">
                        <div className="col-1 col-ml-auto">
                            <label className="form-label" htmlFor="username">{this.state.statusMessage}</label>
                        </div>
                        <div className="col-3 col-mr-auto">
                            <input className="form-input"
                                type="text"
                                id="roomToJoin"
                                name="roomToJoin"
                                placeholder="4 digit room key"
                                value={this.state.roomToJoin}
                                onChange={this.handleChange}
                            />
                          <br></br>
                          <br></br>
                          <div className="col-1 col-ml-auto">
                            <label className="form-label" htmlFor="username">Nickname:</label>
                        </div>
                            <input className="form-input"
                                type="text"
                                id="username"
                                name="username"
                                placeholder="Username"
                                value={this.state.username}
                                onChange={this.handleChange}
                            />
                          <br></br>
                          <br></br>
                          <label for="favcolor">Color:</label>
                          <br></br>
                        <input type="color" id="favcolor" className="colorPicker" name="color" onChange={this.handleChange} value={this.state.color}></input>
                        </div>
                    </div>
                    
                    <div className="form-group ">
                        <div className="col-7"></div>
                        <br></br>
                        <button
                            className="btn synthToolButton col-1 col-mr-auto"
                            onClick={this.handleSubmit}
                            type="submit">Join Room!</button>
                    </div>
                  </form>
                </div>
          )

    


          case 'question':
            return (
              <div>

                  <form className="form-horizontal">
                    <div className="form-group ">
                        <div className="col-7"></div>

                        {this.state.answers.length <= 0
                        ? <div>We did not receieve the answers, yo!</div>
                        : this.state.answers.map((answer, index) => (
                        <div key={index}>
                            <br></br>
                            <br></br>
                          <button
                            style={{padding: 10}}
                            onClick={this.handleAnswer}
                            data-answer={answer}
                            type="submit">
                              {['A', 'B', 'C', 'D', 'E'][index] }: {answer}
                          </button>
                        </div>

                        ))}

                    </div>
                  </form>
                </div>
          )





          case 'wait':
            return (
              <p>{this.state.statusMessage}</p>
          )


          // case 'answer':
          //   return (
          //   <View style={{ flex: 1, padding: 24 }}>
        
          //     <Text style={{ fontSize: 50 }}>{roomStatus.question}</Text>
              
          //     <View style={{flexDirection:'row', flexWrap:'wrap'}}>
                
          //       <Text style={{ padding: 10, fontSize: 40, backgroundColor: (roomStatus.answers[0] == roomStatus.correct) && 'green' }}>A: {roomStatus.answers[0]}</Text>
                
          //       <Text style={{ padding: 10, fontSize: 40, backgroundColor: (roomStatus.answers[1] == roomStatus.correct) && 'green' }}>B: {roomStatus.answers[1]}</Text>
                
          //       <Text style={{ padding: 10, fontSize: 40, backgroundColor: (roomStatus.answers[2] == roomStatus.correct) && 'green' }}>C: {roomStatus.answers[2]}</Text>
          //     </View>

          //   </View>
          // )


          default:
            return (
              <p>Hitting default over here...
                <br></br>
                Status: {this.state.status}
                <br></br>
                StatusMessage: {this.state.statusMessage}
            </p>
            )
        }
      })()}

          
        </div>

      </div>
    )
  }
}



export default App;
