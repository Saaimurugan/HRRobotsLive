import React from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const SpeechToText = () => {
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser does not support speech recognition.</span>;
  }

  return (
    <div>
      <h1>React Speech to Text</h1>
      <p>{transcript}</p>
      <button onClick={SpeechRecognition.startListening}>Start Listening</button>
      <button onClick={SpeechRecognition.stopListening}>Stop Listening</button>
      <button onClick={resetTranscript}>Reset</button>
    </div>
  );
};

export default SpeechToText;
