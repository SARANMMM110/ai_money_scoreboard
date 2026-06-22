import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export function useScanSubmit() {
  const [url, setUrl] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!user) {
      navigate('/register', { state: { url } });
      return;
    }
    try {
      const { scanId } = await api.scans.create(url);
      navigate(`/app/scan/${scanId}`);
    } catch {
      navigate('/app/scan', { state: { url } });
    }
  };

  return { url, setUrl, handleScan, user };
}
