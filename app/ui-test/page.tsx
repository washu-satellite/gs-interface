"use client";
import Dropdown from '@/components/Dropdown';
import OpenMCT from '@/components/OpenMCT'
import { useState } from 'react';

type Tab = {
  title: string;
  content: React.ReactNode;
};

const UITest: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("packets");
  const [dropdowns, setDropdowns] = useState<Array<{ title: string; content: string; date: string; id: number }>>([]);
  const [tabs, setTabs] = useState<Tab[]>([
    { title: "Packets", content: null }, // Content will be dynamically rendered
    { title: "OpenMCT", content: <OpenMCT /> },
  ]);

  const addTab = (title: string, content: React.ReactNode) => {
    if (!tabs.find((tab) => tab.title === title)) {
      setTabs([...tabs, { title, content }]);
    }
    setActiveTab(title); // Set the newly added tab as active
  };

  const removeTab = (title: string) => {
    // Prevent removal of "Packets" and "OpenMCT" tabs
    if (title === "Packets" || title === "OpenMCT") {
      return;
    }

    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.filter((tab) => tab.title !== title);

      // If the active tab is removed, switch to the first tab or a default
      if (activeTab === title && updatedTabs.length > 0) {
        setActiveTab(updatedTabs[0].title);
      } else if (activeTab === title) {
        setActiveTab(""); // No active tab if none remain
      }

      return updatedTabs;
    });
  };

  const removeDropdown = (id: number) => () => {
    setDropdowns(dropdowns.filter((dropdown) => dropdown.id !== id));
  };

  const addDropdown = (header: string, text: string) => () => {
    const formatTime = new Date().toLocaleString();
    const newDropdown = {
      title: `${header} ${dropdowns.length + 1}`,
      content: text,
      date: formatTime,
      id: dropdowns.length,
    };
    setDropdowns([newDropdown, ...dropdowns]);
  };

  return (
    <div className="flex flex-row bg-zinc-800 w-screen h-screen overflow-hidden">
      {/* Command sending placeholder */}
      <div className="w-1/2 bg-gray-200">
        <h1 className="text-black text-center text-lg">Command Placeholder</h1>
        <button onClick={addDropdown("Title", "Content to be added")}>Send Command</button>
      </div>

      {/* Packet / tabular vizualization*/}
      <div className="w-1/2">
        {/* Tab Navigation */}
        <div className="bg-zinc-700 w-full flex">
          {tabs.map((tab) => (
            <div key={tab.title}>
              <button
                onClick={() => setActiveTab(tab.title)}
                className={`w-15 h-10 px-1 text-white ${
                  activeTab === tab.title ? "bg-zinc-800" : "bg-zinc-700"
                }`}
              >
                {tab.title}
              </button>
              <button
                onClick={() => removeTab(tab.title)}
                className={`w-15 h-10 px-1 text-white hover:bg-gray-300 ${activeTab === tab.title ? "bg-zinc-800" : "bg-zinc-700"}`}>x</button>
            </div>
          ))}
        </div>
        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "Packets" ? (
            <ul className="max-h-80 overflow-y-scroll">
              {dropdowns.map((dropdown) => (
                <Dropdown key={dropdown.id} title={dropdown.title}>
                  <p>{dropdown.content}</p>
                  <p>{dropdown.date}</p>
                  <p>{dropdown.id}</p>
                  <button
                    className="border-gray-30 rounded-md px-4 bg-gray-400"
                    onClick={() => addTab(dropdown.title, <div className="w-96 h-96 flex justify-center bg-black">
                      <p className="text-white">Image</p>
                  </div>)}
                  >
                    View Image
                  </button>
                  <button
                    className="border-gray-30 rounded-md px-4 bg-gray-400"
                    onClick={removeDropdown(dropdown.id)}
                  >
                    Delete
                  </button>
                </Dropdown>
              ))}
            </ul>
          ) : (
            tabs.find((tab) => tab.title === activeTab)?.content || (
              <div className="flex justify-center">
                <p className="text-white text-lg">Select a tab to view content</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default UITest;