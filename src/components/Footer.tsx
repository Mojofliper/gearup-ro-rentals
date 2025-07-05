
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div>
            <Link to="/" className="flex items-center space-x-2 font-bold text-xl mb-4">
              <img 
                src="/lovable-uploads/81ffbf32-0e06-4641-b110-f9aec3ae32c7.png" 
                alt="GearUp" 
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-gray-400 text-sm">
              Platforma care conectează creatorii romani. Închiriază sau oferă spre închiriere echipament profesional în siguranță.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Link-uri rapide</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/browse" className="text-gray-400 hover:text-white">Caută echipament</Link></li>
              <li><Link to="/add-gear" className="text-gray-400 hover:text-white">Adaugă echipament</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Cum funcționează</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Prețuri</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Suport</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white">Centru de ajutor</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Termeni și condiții</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Politica de confidențialitate</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="font-semibold mb-4">Conectează-te cu noi</h3>
            <div className="space-y-3">
              <a href="mailto:hello@gearup.ro" className="flex items-center space-x-2 text-gray-400 hover:text-white text-sm">
                <Mail className="h-4 w-4" />
                <span>hello@gearup.ro</span>
              </a>
              <div className="flex space-x-3">
                <a href="#" className="text-gray-400 hover:text-white">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 GearUp. Toate drepturile rezervate. Made with ❤️ in Romania</p>
        </div>
      </div>
    </footer>
  );
};
