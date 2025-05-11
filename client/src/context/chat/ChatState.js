import React, { useReducer } from 'react';
import axios from 'axios';
import ChatContext from './chatContext';
import chatReducer from './chatReducer';

import {
  GET_CHANNELS,
  ADD_CHANNEL,
  SET_CURRENT_CHANNEL,
  CLEAR_CURRENT_CHANNEL,
  CHANNEL_ERROR,
  GET_MESSAGES,
  ADD_MESSAGE,
  MESSAGE_ERROR,
  SET_LOADING
} from '../types';

export const ChatProvider = ({ children }) => {
  const initialState = {
    channels: [],
    currentChannel: null,
    messages: [],
    loading: false,
    error: null
  };

  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Get Channels
  const getChannels = async () => {
    setLoading();
    try {
      const res = await axios.get('/api/channels');

      dispatch({
        type: GET_CHANNELS,
        payload: res.data
      });
    } catch (err) {
      dispatch({
        type: CHANNEL_ERROR,
        payload: err.response.msg
      });
    }
  };

  // Add Channel
  const addChannel = async channel => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const res = await axios.post('/api/channels', channel, config);

      dispatch({
        type: ADD_CHANNEL,
        payload: res.data
      });
    } catch (err) {
      dispatch({
        type: CHANNEL_ERROR,
        payload: err.response.msg
      });
    }
  };

  // Set Current Channel
  const setCurrentChannel = channel => {
    dispatch({
      type: SET_CURRENT_CHANNEL,
      payload: channel
    });
  };

  // Clear Current Channel
  const clearCurrentChannel = () => {
    dispatch({ type: CLEAR_CURRENT_CHANNEL });
  };

  // Get Messages
  const getMessages = async channelId => {
    setLoading();
    try {
      const res = await axios.get(`/api/messages/${channelId}`);

      dispatch({
        type: GET_MESSAGES,
        payload: res.data
      });
    } catch (err) {
      dispatch({
        type: MESSAGE_ERROR,
        payload: err.response.msg
      });
    }
  };

  // Add Message
  const addMessage = async message => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const res = await axios.post('/api/messages', message, config);

      dispatch({
        type: ADD_MESSAGE,
        payload: res.data
      });
    } catch (err) {
      dispatch({
        type: MESSAGE_ERROR,
        payload: err.response.msg
      });
    }
  };

  // Set Loading
  const setLoading = () => dispatch({ type: SET_LOADING });

  return (
    <ChatContext.Provider
      value={{
        channels: state.channels,
        currentChannel: state.currentChannel,
        messages: state.messages,
        loading: state.loading,
        error: state.error,
        getChannels,
        addChannel,
        setCurrentChannel,
        clearCurrentChannel,
        getMessages,
        addMessage,
        setLoading
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};