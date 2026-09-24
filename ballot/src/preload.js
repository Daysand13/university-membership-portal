"use strict";

const { contextBridge, ipcRenderer } = require("electron");

/**
 * The only door between the ballot on screen and the process that holds
 * the terminal's key.
 *
 * Six named messages, nothing else — no file access, no network, no way
 * to ask for the key back. What the page can do is ask whether an index
 * number checks out, and hand over a completed paper.
 */
contextBridge.exposeInMainWorld("ballot", {
  getState: () => ipcRenderer.invoke("ballot:getState"),
  configure: (settings) => ipcRenderer.invoke("ballot:configure", settings),
  verify: (indexNumber) => ipcRenderer.invoke("ballot:verify", indexNumber),
  cast: (paper) => ipcRenderer.invoke("ballot:cast", paper),
  reconfigure: (key) => ipcRenderer.invoke("ballot:reconfigure", key),
  quit: (key) => ipcRenderer.invoke("ballot:quit", key),

  onState: (handler) => {
    const listener = (_event, state) => handler(state);
    ipcRenderer.on("ballot:state", listener);
    return () => ipcRenderer.removeListener("ballot:state", listener);
  },
  onSay: (handler) => {
    const listener = (_event, clip) => handler(clip);
    ipcRenderer.on("ballot:say", listener);
    return () => ipcRenderer.removeListener("ballot:say", listener);
  },
});
