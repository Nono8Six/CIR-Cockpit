
import { Interaction, TimelineEvent } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'cir_cockpit_interactions_v1';

const hydrateTimeline = (interaction: any): Interaction => ({
  ...interaction,
  timeline: interaction.timeline || [
    {
      id: 'init-' + interaction.id,
      date: interaction.created_at,
      type: 'creation',
      content: 'Dossier créé',
      author: 'Système'
    }
  ]
});

const getLocalInteractions = (): Interaction[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    return parsed.map((i: any) => hydrateTimeline(i));
  }
  return [];
};

const saveLocalInteraction = (interaction: Interaction): Interaction[] => {
  const current = getLocalInteractions();
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

const updateLocalTimeline = (
  interactionId: string,
  event: TimelineEvent,
  updates?: Partial<Interaction>
): Interaction[] => {
  const current = getLocalInteractions();
  const index = current.findIndex(i => i.id === interactionId);

  if (index >= 0) {
    const interaction = current[index];
    const updatedInteraction = {
      ...interaction,
      ...updates,
      timeline: [...interaction.timeline, event]
    };

    current[index] = updatedInteraction;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  }
  return current;
};

export const getInteractions = async (): Promise<Interaction[]> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(hydrateTimeline);
    }
    console.warn('Supabase interactions fetch failed, falling back to local storage.', error);
  }

  return getLocalInteractions();
};

export const saveInteraction = async (interaction: Interaction): Promise<Interaction[]> => {
  if (supabase) {
    const { error } = await supabase
      .from('interactions')
      .upsert(interaction, { onConflict: 'id' });

    if (!error) {
      return getInteractions();
    }
    console.warn('Supabase interaction save failed, falling back to local storage.', error);
  }

  return saveLocalInteraction(interaction);
};

export const addTimelineEvent = async (
  interactionId: string,
  event: TimelineEvent,
  updates?: Partial<Interaction>
): Promise<Interaction[]> => {
  const current = await getInteractions();
  const index = current.findIndex(i => i.id === interactionId);

  if (index >= 0) {
    const interaction = current[index];
    const updatedInteraction = {
      ...interaction,
      ...updates,
      timeline: [...interaction.timeline, event]
    };

    if (supabase) {
      const { error } = await supabase
        .from('interactions')
        .update(updatedInteraction)
        .eq('id', interactionId);

      if (!error) {
        return getInteractions();
      }
      console.warn('Supabase interaction update failed, falling back to local storage.', error);
    }

    return updateLocalTimeline(interactionId, event, updates);
  }
  return current;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Extract unique company names from existing interactions for autocomplete
export const getKnownCompanies = async (): Promise<string[]> => {
  const interactions = await getInteractions();
  // Filter out empty names and duplicates
  const companies = new Set(
    interactions
      .map(i => i.company_name)
      .filter(name => name && name.trim().length > 0)
  );
  return Array.from(companies).sort();
};
