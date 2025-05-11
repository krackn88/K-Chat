import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

// Components
import ChannelList from '../components/channels/ChannelList';
import ChatArea from '../components/chat/ChatArea';
import UserSettings from '../components/user/UserSettings';

// Context
import AuthContext from '../context/auth/authContext';
import ChatContext from '../context/chat/chatContext';

// Socket
import io from 'socket.io-client';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: 0,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  }),
);

const Dashboard = () => {
  const authContext = useContext(AuthContext);
  const chatContext = useContext(ChatContext);
  const navigate = useNavigate();

  const { user, logout } = authContext;
  const { getChannels } = chatContext;

  const [open, setOpen] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to socket.io server
    const newSocket = io();
    setSocket(newSocket);

    // Load channels
    getChannels();

    // Clean up on unmount
    return () => newSocket.close();
    // eslint-disable-next-line
  }, []);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            K-Chat
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user.name}
              </Typography>
              <IconButton color="inherit" onClick={onLogout}>
                <ExitToAppIcon />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', padding: 1 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Channels
            </Typography>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <Divider />
          <ChannelList />
        </Box>
      </Drawer>
      <Main open={open}>
        <Toolbar />
        <Routes>
          <Route path="/" element={<ChatArea socket={socket} />} />
          <Route path="/channels/:channelId" element={<ChatArea socket={socket} />} />
          <Route path="/settings" element={<UserSettings />} />
        </Routes>
      </Main>
    </Box>
  );
};

export default Dashboard;