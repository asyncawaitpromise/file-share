import React, { useEffect, useRef, useState } from 'react';
import Message from './helpers/Message';
import BackendInterface from './helpers/BackendInterface';
import { BrowserRouter, Routes, Route, useParams, Link }  from "react-router-dom";

const backend = new BackendInterface();
const App = () => {
  const params = useParams();
  const [messages, setMessages] = useState([]);
  const [fileUrl, setFileUrl] = useState(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const keyInputRef = useRef(null);

  useEffect(() => {
    if (params.key) {
      keyInputRef.current.value = params.key;
    }
  }, []);

  const showMessage = async (msg, className) => {
    const wait = s => new Promise(r => setTimeout(r, s * 1e3));
    const message = new Message(msg, className);
    setMessages(c => [...c, message]);
    await wait(3);
    setMessages(c => c.filter(m => m.id !== message.id));
  };
  const handleForm = async e => {
    e.preventDefault();
    setFileUrl(null);
    setIsDisabled(true);
    const form = e.currentTarget;
    form.disabled = "true";
    const formData = new FormData(form);
    const key = formData.get("key");
    showMessage(`Attempting to retrieve file for key: ${key}`);
    const file = await backend.getFile(key);
    setIsDisabled(false);
    if (!file) return showMessage("No file found!", "alert-error");
    showMessage("File found!", "alert-success");
    setFileUrl(file.url);
  };
  return (
    <main className='grid items-center content-center min-h-[100dvh]'>
      <form onSubmit={handleForm} className='card-body max-w-screen-sm m-auto'>
        <h1 className='card-title'>Please enter your code:</h1>
        <label className="input input-bordered flex items-center gap-2">
          <input 
            ref={keyInputRef}
            disabled={isDisabled} type="text" className="grow" placeholder="Key" name="key" />
        </label>
        <button disabled={isDisabled} className='btn btn-primary'>Submit</button>
      </form>
      {
        fileUrl &&
        <div className='card-body max-w-screen-sm m-auto'>
          <h1>Links are only valid for 5 mins from initial request</h1>
          <a target="_blank" href={fileUrl} className='link link-primary'>Here's your file</a>
        </div>
      }
      <div className="toast toast-top">
        {
          messages.map(m => (
            <div key={"message-"+m.id} className={"alert " + m.className}>
              <span>{m.id}: {m.content}</span>
            </div>
          ))
        }
      </div>
    </main>
  );
};

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path=":key" element={<App />} />
        <Route path="/" element={<App />} />
        <Route path="*" element={(
          <>
            What? How'd you get here? <Link className='btn btn-primary' to="/">Go back</Link>
          </>
        )}  />
      </Routes>
    </BrowserRouter>
  )
};

export default Router;