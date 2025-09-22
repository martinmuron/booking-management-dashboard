"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Users } from "lucide-react";

interface SearchCriteria {
  checkInDate: Date | null;
  checkOutDate: Date | null;
  guests: number;
}

interface PropertySearchProps {
  onSearch: (criteria: SearchCriteria) => void;
  isSearching?: boolean;
}

export function PropertySearch({ onSearch, isSearching = false }: PropertySearchProps) {
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);

  const handleSearch = () => {
    if (!checkInDate || !checkOutDate) {
      return;
    }

    onSearch({
      checkInDate,
      checkOutDate,
      guests
    });
  };

  const isValidDateRange = checkInDate && checkOutDate && checkInDate < checkOutDate;

  return (
    <Card className="p-6 bg-white shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Check-in Date */}
        <div className="space-y-2">
          <Label htmlFor="checkin" className="text-sm font-medium text-gray-700">
            Check-in
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <DatePicker
              selected={checkInDate}
              onChange={(date) => setCheckInDate(date)}
              selectsStart
              startDate={checkInDate}
              endDate={checkOutDate}
              minDate={new Date()}
              placeholderText="Select date"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              dateFormat="MMM d, yyyy"
            />
          </div>
        </div>

        {/* Check-out Date */}
        <div className="space-y-2">
          <Label htmlFor="checkout" className="text-sm font-medium text-gray-700">
            Check-out
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <DatePicker
              selected={checkOutDate}
              onChange={(date) => setCheckOutDate(date)}
              selectsEnd
              startDate={checkInDate}
              endDate={checkOutDate}
              minDate={checkInDate || new Date()}
              placeholderText="Select date"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              dateFormat="MMM d, yyyy"
            />
          </div>
        </div>

        {/* Guests */}
        <div className="space-y-2">
          <Label htmlFor="guests" className="text-sm font-medium text-gray-700">
            Guests
          </Label>
          <Select value={guests.toString()} onValueChange={(value) => setGuests(parseInt(value))}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'guest' : 'guests'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <div>
          <Button 
            onClick={handleSearch}
            disabled={!isValidDateRange || isSearching}
            className="w-full bg-black hover:bg-gray-800 text-white h-10"
          >
            <Search className="w-4 h-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Date validation message */}
      {checkInDate && checkOutDate && checkInDate >= checkOutDate && (
        <div className="mt-3 text-sm text-red-600">
          Check-out date must be after check-in date
        </div>
      )}
    </Card>
  );
}
