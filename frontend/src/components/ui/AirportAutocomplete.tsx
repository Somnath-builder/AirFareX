import React, { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const AIRPORTS = [
  { code: 'DEL', name: 'New Delhi (Indira Gandhi Int)' },
  { code: 'BOM', name: 'Mumbai (Chhatrapati Shivaji Int)' },
  { code: 'BLR', name: 'Bangalore (Kempegowda Int)' },
  { code: 'MAA', name: 'Chennai (Chennai Int)' },
  { code: 'HYD', name: 'Hyderabad (Rajiv Gandhi Int)' },
  { code: 'CCU', name: 'Kolkata (Netaji Subhas Chandra Bose)' },
  { code: 'PNQ', name: 'Pune (Pune Airport)' },
  { code: 'GOI', name: 'Goa (Dabolim Airport)' },
  { code: 'AMD', name: 'Ahmedabad (Sardar Vallabhbhai Patel)' },
  { code: 'ATQ', name: 'Amritsar (Sri Guru Ram Dass Jee)' }
];

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AirportAutocomplete({ value, onChange, placeholder }: AirportAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState(AIRPORTS);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    onChange(val);
    
    if (val) {
      setFiltered(AIRPORTS.filter(a => a.code.includes(val) || a.name.toUpperCase().includes(val)));
      setIsOpen(true);
    } else {
      setFiltered(AIRPORTS);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full z-[100]" ref={wrapperRef}>
      <input 
        type="text" 
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2.5 px-3 text-sm font-mono text-white placeholder:text-[#24344A] focus:outline-none" 
      />
      
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-[#030712] border border-[#06b6d4] shadow-[0_0_30px_rgba(0,0,0,0.8)] max-h-60 overflow-y-auto font-mono text-xs">
          {filtered.map((airport, idx) => (
            <div 
              key={idx}
              className="px-3 py-2 cursor-pointer hover:bg-[#06b6d4]/20 border-b border-[#24344A] flex justify-between items-center group transition-colors"
              onClick={() => {
                onChange(airport.code);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-[#06b6d4] opacity-50 group-hover:opacity-100" />
                <span className="text-[#06b6d4] font-bold tracking-wider">{airport.code}</span>
              </div>
              <span className="text-[#718198] text-right truncate pl-2">{airport.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
