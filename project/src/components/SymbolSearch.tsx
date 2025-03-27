import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, StarOff } from 'lucide-react';
import { searchSymbols } from '../services/dataService';
import { SymbolInfo, FavoriteSymbol } from '../types/chartTypes';

interface SymbolSearchProps {
  onSelectSymbol: (symbol: string) => void;
}

const FAVORITES_KEY = 'chart-favorites';

const SymbolSearch: React.FC<SymbolSearchProps> = ({ onSelectSymbol }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [favorites, setFavorites] = useState<FavoriteSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load favorites from local storage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Search symbols when search term changes
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setIsLoading(true);
        const results = await searchSymbols(searchTerm);
        setSymbols(results);
        setIsLoading(false);
      } else {
        setSymbols([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSymbolSelect = (symbol: SymbolInfo) => {
    onSelectSymbol(symbol.code);
    setSearchTerm(symbol.code);
    setIsDropdownOpen(false);
  };

  const toggleFavorite = (symbol: SymbolInfo, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const isFavorite = favorites.some(fav => fav.code === symbol.code);
    let newFavorites: FavoriteSymbol[];
    
    if (isFavorite) {
      newFavorites = favorites.filter(fav => fav.code !== symbol.code);
    } else {
      const newFavorite: FavoriteSymbol = {
        ...symbol,
        addedAt: Date.now()
      };
      newFavorites = [...favorites, newFavorite];
    }
    
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const renderSymbolItem = (symbol: SymbolInfo, isFavorite: boolean) => (
    <li
      key={symbol.code}
      onClick={() => handleSymbolSelect(symbol)}
      className="px-2.5 py-2 hover:bg-gray-800 cursor-pointer text-white text-xs border-b border-gray-800 last:border-b-0 group"
    >
      <div className="flex justify-between items-center">
        <div className="flex-grow">
          <span className="font-medium">{symbol.code}</span>
          <span className="ml-2 text-gray-400">{symbol.exchange}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{symbol.currency_code}</span>
          <button
            onClick={(e) => toggleFavorite(symbol, e)}
            className="opacity-0 group-hover:opacity-100 hover:text-yellow-500 transition-opacity"
          >
            {isFavorite ? <Star size={14} className="fill-yellow-500 text-yellow-500" /> : <StarOff size={14} />}
          </button>
        </div>
      </div>
      <div className="text-gray-400 text-[10px] mt-0.5">{symbol.description}</div>
    </li>
  );

  return (
    <div className="relative" ref={dropdownRef}>
        <div className="h-7 relative">
          <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
            <Search size={13} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search symbol..."
            className="pl-6 pr-2 py-1 h-7 bg-[#161616] border-0 rounded text-xs text-white outline-none focus:outline-none focus:ring-0 w-40"
          />
        </div>
        
        {isDropdownOpen && (
          <div className="absolute mt-1 w-64 bg-[#161616] border border-gray-800 rounded shadow-lg z-[9999]">
            {/* Show favorites if no search term */}
            {!searchTerm && favorites.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 text-gray-400 text-[10px] uppercase font-medium bg-gray-900">
                  Favorites
                </div>
                <ul className="max-h-40 overflow-y-auto scrollbar-hide">
                  {favorites.map(symbol => renderSymbolItem(symbol, true))}
                </ul>
              </div>
            )}
            
            {/* Search results */}
            {searchTerm && isLoading ? (
              <div className="px-2.5 py-1.5 text-gray-400 text-xs">Loading...</div>
            ) : searchTerm && symbols.length > 0 ? (
              <div>
                <div className="px-2.5 py-1.5 text-gray-400 text-[10px] uppercase font-medium bg-gray-900">
                  Search Results
                </div>
              <ul className="max-h-60 overflow-y-auto scrollbar-hide">
                {symbols.map(symbol => renderSymbolItem(symbol, favorites.some(fav => fav.code === symbol.code)))}
              </ul>
              </div>
            ) : searchTerm.length < 2 ? (
              <div className="px-2.5 py-1.5 text-gray-400 text-xs">Type at least 2 characters to search</div>
            ) : (
              <div className="px-2.5 py-1.5 text-gray-400 text-xs">No results found</div>
            )}
          </div>
        )}
    </div>
  );
};

export default SymbolSearch;