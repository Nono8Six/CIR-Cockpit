
import { Interaction, TimelineEvent } from '../types';

const STORAGE_KEY = 'cir_cockpit_interactions_v1';

export const getInteractions = (): Interaction[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    // Migration: Ensure all interactions have a timeline array
    return parsed.map((i: any) => ({
      ...i,
      timeline: i.timeline || [
        // Backfill creation event if missing
        {
          id: 'init-' + i.id,
          date: i.created_at,
          type: 'creation',
          content: 'Dossier créé',
          author: 'Système'
        }
      ]
    }));
  }
  return []; 
};

export const saveInteraction = (interaction: Interaction): Interaction[] => {
  const current = getInteractions();
  const index = current.findIndex(i => i.id === interaction.id);
  let updatedList;
  
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = interaction;
  } else {
    updatedList = [interaction, ...current];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
};

export const addTimelineEvent = (interactionId: string, event: TimelineEvent, updates?: Partial<Interaction>): Interaction[] => {
  const current = getInteractions();
  const index = current.findIndex(i => i.id === interactionId);
  
  if (index >= 0) {
    const interaction = current[index];
    
    // Create new updated interaction object
    const updatedInteraction = {
      ...interaction,
      ...updates, // Apply top-level updates (status, reminder...)
      timeline: [...interaction.timeline, event] // Append event
    };

    current[index] = updatedInteraction;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  }
  return current;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Extract unique company names from existing interactions for autocomplete
export const getKnownCompanies = (): string[] => {
  const interactions = getInteractions();
  // Filter out empty names and duplicates
  const companies = new Set(
    interactions
      .map(i => i.company_name)
      .filter(name => name && name.trim().length > 0)
  );
  return Array.from(companies).sort();
};
