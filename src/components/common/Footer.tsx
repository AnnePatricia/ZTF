import React from "react";

const Footer: React.FC = () => (
  <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-4 mt-8">
    <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} BCM Gest. Tous droits réservés.
      </span>
      <div className="flex space-x-4 mt-2 md:mt-0">
        <a
          href="#"
          className="text-gray-400 hover:text-primary transition-colors"
          aria-label="Mentions légales"
        >
          Mentions légales
        </a>
        <a
          href="#"
          className="text-gray-400 hover:text-primary transition-colors"
          aria-label="Contact"
        >
          Contact
        </a>
        <a
          href="#"
          className="text-gray-400 hover:text-primary transition-colors"
          aria-label="Aide"
        >
          Aide
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;