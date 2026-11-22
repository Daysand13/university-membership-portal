"use strict";

const { contextBridge, ipcRenderer } = require("electron");

/**
 * The only door between the ballot on screen and the process that holds
 * the terminal's key.
 *
 * A handful of named messages, nothing else — no file access, no network,
 * no way to ask for the key back. What the page can do is ask whether an
 * index number checks out, hand over a completed paper, and fetch the
 * recording of a fixed announcement for the hall speaker.
 */
contextBridge.exposeInMainWorld("ballot", {
  getState: () => ipcRenderer.invoke("ballot:getState"),
  configure: (settings) => ipcRenderer.invoke("ballot:configure", settings),
  verify: (indexNumber) => ipcRenderer.invoke("ballot:verify", indexNumber),
  cast: (paper) => ipcRenderer.invoke("ballot:cast", paper),
  reconfigure: (key) => ipcRenderer.invoke("ballot:reconfigure", key),
  quit: (key) => ipcRenderer.invoke("ballot:quit", key),

  // The hall speaker. A phrase is asked for by its key from a fixed list;
  // there is no message that takes text to say.
  checkKey: (key) => ipcRenderer.invoke("ballot:checkKey", key),
  voices: () => ipcRenderer.invoke("ballot:voices"),
  clip: (key) => ipcRenderer.invoke("ballot:clip", key),
  setVoice: (key, settings) => ipcRenderer.invoke("ballot:setVoice", { key, settings }),

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
