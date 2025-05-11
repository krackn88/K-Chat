import React, { useContext, useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import Paper from '@mui/material/Paper';

import ChatContext from '../../context/chat/chatContext';
import AuthContext from '../../context/auth/authContext';
import MessageItem from './MessageItem';

const ChatArea = ({ socket }) => {
  const chatContext = useContext(ChatContext);
  const authContext = useContext(AuthContext);
  const { channelId } = useParams();
  
  const { user } = authContext;
  const { 
    currentChannel, 
    messages, 
    getMessages, 
    addMessage, 
    setCurrentChannel, 
    channels 
  } = chatContext;

  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (channelId && channels.length > 0) {
      const channel = channels.find(ch => ch._id === channelId);
      if (channel) {
        setCurrentChannel(channel);
        getMessages(channelId);
      }
    }

    // Join socket room
    if (socket && channelId) {
      socket.emit('join_room', channelId);

      // Listen for incoming messages
      socket.on('receive_message', data => {
        addMessage(data);
      });
    }

    // Cleanup
    return () => {
      if (socket && channelId) {
        socket.emit('leave_room', channelId);
        socket.off('receive_message');
      }
    };
    // eslint-disable-next-line
  }, [channelId, channels, socket]);

  const onChange = e => setMessage(e.target.value);

  const onSubmit = e => {
    e.preventDefault();
    if (message.trim() === '') return;

    const newMessage = {
      content: message,
      sender: user._id,
      channel: currentChannel._id,
      date: new Date()
    };

    // Emit socket event
    if (socket) {
      socket.emit('send_message', newMessage);
    }

    // Add to state
    addMessage(newMessage);

    // Clear input
    setMessage('');
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden'
    }}>
      {currentChannel ? (
        <>
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider' 
          }}>
            <Typography variant="h6">{currentChannel.name}</Typography>
            {currentChannel.description && (
              <Typography variant="body2" color="text.secondary">
                {currentChannel.description}
              </Typography>
            )}
          </Box>

          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {messages.map(msg => (
              <MessageItem key={msg._id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </Box>

          <Paper sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider'
          }}>
            <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex' }}>
              <TextField
                fullWidth
                placeholder="Type a message"
                variant="outlined"
                value={message}
                onChange={onChange}
                sx={{ mr: 1 }}
              />
              <IconButton type="submit" color="primary">
                <SendIcon />
              </IconButton>
            </Box>
          </Paper>
        </>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%' 
        }}>
          <Typography variant="h6" color="text.secondary">
            Select a channel to start chatting
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChatArea;