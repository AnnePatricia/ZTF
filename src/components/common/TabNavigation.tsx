import React from "react";

interface TabNavigationProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => (
  <nav className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
    {tabs.map((tab) => (
      <button
        key={tab}
        className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none transition-colors
          ${
            activeTab === tab
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary/10"
          }`}
        onClick={() => onTabChange(tab)}
        type="button"
      >
        {tab}
      </button>
    ))}
  </nav>);

export default TabNavigation;