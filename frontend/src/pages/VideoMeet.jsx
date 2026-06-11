
import React, { useEffect, useRef, useState } from 'react'
import styles from "../styles/videoComponent.module.css";
import TextField from '@mui/material/TextField';
import Button from "@mui/material/Button";
import { io } from "socket.io-client";
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import IconButton from '@mui/material/IconButton';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import Badge from '@mui/material/Badge';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import server from '../environment';

const server_url = server;

const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export default function VideoMeetComponent() {

    const connections = useRef({});
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoRef = useRef();

    const cameraStreamRef = useRef(null);

    const routeTo = useNavigate();

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState(false);
    const [audio, setAudio] = useState(false);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [videos, setVideos] = useState([]);

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [showModal, setModal] = useState(true);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");

    const setVideoRef = (element, stream) => {
        if (element && stream && element.srcObject !== stream) {
            element.srcObject = stream;

            element.onloadedmetadata = () => {
                element.play().catch(err => console.log("Play error:", err));
            };
        }
    };

    let handleScreen = async () => {
        if (!screen) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                setScreen(true);

                // set local stream
                window.localStream = stream;
                localVideoRef.current.srcObject = stream;

                const videoTrack = stream.getVideoTracks()[0];
                const audioTrack = window.localStream.getAudioTracks()[0]; 

                for (let id in connections.current) {
                    let senders = connections.current[id].getSenders();

                    let videoSender = senders.find(s => s.track?.kind === "video");
                    let audioSender = senders.find(s => s.track?.kind === "audio");

                    if (videoSender && videoTrack) {
                        videoSender.replaceTrack(videoTrack);
                    }

                    if (audioSender && audioTrack) {
                        audioSender.replaceTrack(audioTrack); 
                    }
                }

                // when screen share stops
                stream.getTracks().forEach(track => {
                    track.onended = async () => {

                        setScreen(false);

                        const camStream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: true
                        });

                        window.localStream = camStream;
                        localVideoRef.current.srcObject = camStream;

                        const camVideoTrack = camStream.getVideoTracks()[0];
                        const camAudioTrack = camStream.getAudioTracks()[0];

                        for (let id in connections.current) {
                            let senders = connections.current[id].getSenders();

                            let videoSender = senders.find(s => s.track?.kind === "video");
                            let audioSender = senders.find(s => s.track?.kind === "audio");

                            if (videoSender) videoSender.replaceTrack(camVideoTrack);
                            if (audioSender) audioSender.replaceTrack(camAudioTrack);
                        }
                    };
                });

            } catch (err) {
                console.log("Screen share error:", err);
            }

        } else {
            try {
                window.localStream.getTracks().forEach(track => track.stop());

                const camStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                camStream.getAudioTracks().forEach(track => {
                    track.enabled = false; 
                });

                window.localStream = camStream;
                localVideoRef.current.srcObject = camStream;

                const camVideoTrack = camStream.getVideoTracks()[0];
                const camAudioTrack = camStream.getAudioTracks()[0];

                for (let id in connections.current) {
                    let senders = connections.current[id].getSenders();

                    let videoSender = senders.find(s => s.track?.kind === "video");
                    let audioSender = senders.find(s => s.track?.kind === "audio");

                    if (videoSender) videoSender.replaceTrack(camVideoTrack);
                    if (audioSender) audioSender.replaceTrack(camAudioTrack);
                }

                setScreen(false);

            } catch (err) {
                console.log("Error stopping screen share:", err);
            }
        }
    };

    let handleAudio = () => {
        setAudio(prev => {
            const newState = !prev;

            if (window.localStream) {
                window.localStream.getAudioTracks().forEach(track => {
                    track.enabled = newState; 
                });
            }

            return newState;
        });
    };

    const handleVideo = () => {
        setVideo(prev => {
            const newState = !prev;

            if (window.localStream) {
                window.localStream.getVideoTracks().forEach(track => {
                    track.enabled = newState; 
                });
            }

            return newState;
        });
    };

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                window.localStream = stream;
                cameraStreamRef.current = stream;

                localVideoRef.current.srcObject = stream;

                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });

                stream.getVideoTracks().forEach(track => {
                    track.enabled = true;
                });

                setVideoAvailable(true);
                setAudioAvailable(true);
                setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
            });
    }, []);


    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages(prev => prev + 1);
        }
    };

    const gotMessageFromServer = async (fromId, message) => {
        const signal = JSON.parse(message);
        const connection = connections.current[fromId];
        if (!connection) return;

        if (signal.sdp) {

            if (signal.sdp.type === "offer") {

                //  FIX: duplicate offer ignore
                if (connection.signalingState !== "stable") {
                    console.log("Skipping duplicate offer");
                    return;
                }

                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);

                socketRef.current.emit("signal", fromId, JSON.stringify({
                    sdp: connection.localDescription
                }));

            } else if (signal.sdp.type === "answer") {

                if (connection.signalingState !== "have-local-offer") {
                    console.log("Skipping invalid answer");
                    return;
                }

                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            }
        }

        if (signal.ice) {
            try {
                await connection.addIceCandidate(new RTCIceCandidate(signal.ice));
            } catch (e) { }
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io(server_url);

        socketRef.current.on("signal", gotMessageFromServer);
        socketRef.current.on("chat-message", addMessage);

        socketRef.current.on("connect", () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit("join-call", window.location.href);

            socketRef.current.on("user-joined", (id, clients) => {

                clients.forEach(socketListId => {
                    if (socketListId === socketIdRef.current) return;

                    if (!connections.current[socketListId]) {
                        const pc = new RTCPeerConnection(peerConfigConnections);
                        connections.current[socketListId] = pc;

                        pc.onicecandidate = (e) => {
                            if (e.candidate) {
                                socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: e.candidate }));
                            }
                        };

                        pc.ontrack = (event) => {
                            setVideos(prev => {
                                const found = prev.find(v => v.socketId === socketListId);
                                if (found) {
                                    return prev.map(v => v.socketId === socketListId ? { ...v, stream: event.streams[0] } : v);
                                }
                                return [...prev, { socketId: socketListId, stream: event.streams[0] }];
                            });
                        };

                        if (window.localStream) {
                            window.localStream.getTracks().forEach(track => {
                                pc.addTrack(track, window.localStream);
                            });
                        }
                    }
                });

                clients.forEach(id2 => {
                    if (id2 === socketIdRef.current) return;

                    if (socketIdRef.current < id2) {
                        connections.current[id2].createOffer()
                            .then(d => connections.current[id2].setLocalDescription(d))
                            .then(() => {
                                socketRef.current.emit("signal", id2, JSON.stringify({
                                    sdp: connections.current[id2].localDescription
                                }));
                            });
                    }
                });
            });
        });
    };

    const connect = async () => {
        setAskForUsername(false);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            cameraStreamRef.current = stream;
            window.localStream = stream;

            //  local video show
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;

                localVideoRef.current.onloadedmetadata = () => {
                    localVideoRef.current.play().catch(() => { });
                };
            }

            //  mic OFF by default
            stream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });

            setVideo(true);
            setAudio(false);

            connectToSocketServer();

            //  HISTORY SAVE
            await axios.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: window.location.pathname
            });

        } catch (err) {
            console.log("Error getting media:", err);
        }
    };

    const handleEndCall = () => {
        socketRef.current?.disconnect();
        Object.values(connections.current).forEach(c => c.close());
        routeTo("/home");
    };

    const sendMessage = () => {
        socketRef.current.emit("chat-message", message, username);
        setMessage("");
    };

    return (
        <div>
            {
                askForUsername === true ?
                    <div>
                        <h2>Enter into Lobby</h2>
                        <TextField value={username} onChange={e => setUsername(e.target.value)} />
                        <Button variant='contained' onClick={connect}>Connect</Button>
                        <video ref={localVideoRef} autoPlay muted />
                    </div>
                    :
                    <div className={styles.meetVideoContainer}>

                        {showModal ? <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>

                                <div className={styles.chattingDisplay}>
                                    {messages.map((item, index) => (
                                        <div key={index} style={{ marginBottom: "20px" }}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        label="Enter your chat"
                                    />
                                    <Button variant='contained' onClick={sendMessage}>SEND</Button>
                                </div>
                            </div>
                        </div> : null}

                        <div className={styles.buttonContainers}>
                            <IconButton onClick={handleVideo} style={{ color: 'white' }}>
                                {video ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>

                            <IconButton onClick={handleEndCall} style={{ color: 'red' }}>
                                <CallEndIcon />
                            </IconButton>

                            <IconButton onClick={handleAudio} style={{ color: 'white' }}>
                                {(audio === true) ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>

                            {screenAvailable &&
                                <IconButton onClick={handleScreen} style={{ color: 'white' }}>
                                    {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                                </IconButton>
                            }

                            <Badge badgeContent={newMessages} max={999} color='secondary'>
                                <IconButton onClick={() => setModal(!showModal)} style={{ color: 'white' }}>
                                    <ChatIcon />
                                </IconButton>
                            </Badge>
                        </div>

                        <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted />

                        <div className={styles.confrenceView}>
                            {videos.map(v => {
                                console.log("Audio Tracks:", v.stream.getAudioTracks()); 

                                return (
                                    <div key={v.socketId}>
                                        <video
                                            ref={ref => setVideoRef(ref, v.stream)}
                                            autoPlay
                                            playsInline
                                        />
                                    </div>
                                );
                            })}
                        </div>

                    </div>
            }
        </div>
    );
}