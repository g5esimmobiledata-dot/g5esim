import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

const BannerSection = () => {
  const { data: bannersResponse } = useQuery({
    queryKey: ['/api/banner'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/banner');
      const res = await response.json();
      return res;
    },
  });

  console.log('bannersResponse', bannersResponse);
  return <div>BannerSection</div>;
};

export default BannerSection;
