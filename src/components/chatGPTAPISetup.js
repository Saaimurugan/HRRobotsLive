import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ChatGPTAPISetup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const handleSave = () => {
    if (apiKey.trim() === "") {
      alert("API Key cannot be empty");
      return;
    }
    // Save the API key (to localStorage or backend, depending on your use case)
    localStorage.setItem("chatgpt_api_key", apiKey);
    alert("API Key saved successfully!");
    setIsOpen(false);
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Button onClick={() => setIsOpen(true)} className="px-4 py-2">
        Set ChatGPT API Key
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set ChatGPT API Key</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              API Key
            </label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="mt-2 w-full"
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="ml-2">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatGPTAPISetup;
