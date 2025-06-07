import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { SimulationInputData, Plan } from '../types';
import { toast } from 'react-hot-toast';
import { initialSimulationInput } from '../constants';

export const usePlanData = () => {
// ... existing code ...
} 
