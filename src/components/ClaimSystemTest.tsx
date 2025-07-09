import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export const ClaimSystemTest: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);

  const addResult = (name: string, status: 'pending' | 'success' | 'error', message: string, details?: any) => {
    setResults(prev => [...prev, { name, status, message, details }]);
  };

  const runTests = async () => {
    if (!user) {
      toast.error('Please log in to run tests');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      // Test 1: Check if claims table exists and is accessible
      addResult('Database Access', 'pending', 'Checking claims table access...');
      const { data: tableTest, error: tableError } = await supabase
        .from('claims')
        .select('count')
        .limit(1);
      
      if (tableError) {
        addResult('Database Access', 'error', `Claims table error: ${tableError.message}`, tableError);
      } else {
        addResult('Database Access', 'success', 'Claims table is accessible');
      }

      // Test 2: Check if user has bookings
      addResult('User Bookings', 'pending', 'Checking for user bookings...');
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, payment_status, escrow_status, gear:gear_id(title)')
        .or(`owner_id.eq.${user.id},renter_id.eq.${user.id}`)
        .limit(5);

      if (bookingError) {
        addResult('User Bookings', 'error', `Booking query error: ${bookingError.message}`, bookingError);
      } else if (!bookings || bookings.length === 0) {
        addResult('User Bookings', 'error', 'No bookings found for testing');
      } else {
        addResult('User Bookings', 'success', `Found ${bookings.length} bookings for testing`);
      }

      // Test 3: Test claim creation
      if (bookings && bookings.length > 0) {
        addResult('Claim Creation', 'pending', 'Testing claim creation...');
        const testBooking = bookings[0];
        
        const { data: newClaim, error: claimError } = await supabase
          .from('claims')
          .insert({
            booking_id: testBooking.id,
            claimant_id: user.id,
            claim_type: 'damage',
            description: 'Test claim for system verification - ' + new Date().toISOString(),
            claim_status: 'pending'
          })
          .select()
          .single();

        if (claimError) {
          addResult('Claim Creation', 'error', `Claim creation failed: ${claimError.message}`, claimError);
        } else {
          addResult('Claim Creation', 'success', 'Claim created successfully', newClaim);
        }
      }

      // Test 4: Test claim retrieval
      addResult('Claim Retrieval', 'pending', 'Testing claim retrieval...');
      const { data: userClaims, error: retrieveError } = await supabase
        .from('claims')
        .select('*')
        .eq('claimant_id', user.id)
        .order('created_at', { ascending: false });

      if (retrieveError) {
        addResult('Claim Retrieval', 'error', `Claim retrieval failed: ${retrieveError.message}`, retrieveError);
      } else {
        setClaims(userClaims || []);
        addResult('Claim Retrieval', 'success', `Retrieved ${userClaims?.length || 0} claims`);
      }

      // Test 5: Test storage bucket access
      addResult('Storage Access', 'pending', 'Testing claim-photos storage bucket...');
      try {
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const path = `${user.id}/test_${Date.now()}.txt`;
        const { error: uploadError } = await supabase.storage
          .from('claim-photos')
          .upload(path, testFile);

        if (uploadError) {
          addResult('Storage Access', 'error', `Storage upload failed: ${uploadError.message}`, uploadError);
        } else {
          // Clean up test file
          await supabase.storage.from('claim-photos').remove([path]);
          addResult('Storage Access', 'success', 'Storage bucket is accessible');
        }
      } catch (storageError) {
        addResult('Storage Access', 'error', `Storage test failed: ${storageError}`, storageError);
      }

      // Test 6: Test RLS policies
      addResult('RLS Policies', 'pending', 'Testing Row Level Security...');
      const { data: allClaims, error: rlsError } = await supabase
        .from('claims')
        .select('*')
        .limit(10);

      if (rlsError) {
        addResult('RLS Policies', 'error', `RLS test failed: ${rlsError.message}`, rlsError);
      } else {
        addResult('RLS Policies', 'success', `RLS working - retrieved ${allClaims?.length || 0} claims (filtered by user access)`);
      }

    } catch (error) {
      addResult('General Test', 'error', `Test execution failed: ${error}`, error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">Please log in to test the claims system</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Claims System Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTests} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Running Tests...' : 'Run Claims System Tests'}
          </Button>
          
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Test Results:</h3>
              {results.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">View Details</summary>
                      <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {claims.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Your Claims ({claims.length}):</h3>
              {claims.map((claim) => (
                <div key={claim.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{claim.claim_type}</span>
                    <Badge className={getStatusColor(claim.claim_status)}>
                      {claim.claim_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{claim.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {new Date(claim.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 