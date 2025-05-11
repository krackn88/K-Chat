import React, { useContext } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

import AuthContext from '../../context/auth/authContext';

const MessageItem = ({ message }) => {
  const authContext = useContext(AuthContext);
  const { user } = authContext;

  const isCurrentUser = user && message.sender === user._id;

  // Format timestamp
  const formatTime = (date) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      {!isCurrentUser && (
        <Avatar sx={{ mr: 1 }}>
          {message.sender.name ? message.sender.name.charAt(0) : '?'}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '70%' }}>
        {!isCurrentUser && (
          <Typography variant="body2" color="text.secondary">
            {message.sender.name || 'Unknown'}
          </Typography>
        )}
        <Paper
          elevation={1}
          sx={{
            p: 1,
            bgcolor: isCurrentUser ? 'primary.main' : 'background.paper',
            color: isCurrentUser ? 'white' : 'inherit',
            borderRadius: 2,
          }}
        >
          <Typography variant="body1">{message.content}</Typography>
        </Paper>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: isCurrentUser ? 'right' : 'left', mt: 0.5 }}
        >
          {formatTime(message.date)}
          {message.edited && ' (edited)'}
        </Typography>
      </Box>
      {isCurrentUser && (
        <Avatar sx={{ ml: 1 }}>
          {user.name ? user.name.charAt(0) : '?'}
        </Avatar>
      )}
    </Box>
  );
};

export default MessageItem;