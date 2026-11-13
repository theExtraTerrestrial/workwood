// Stands in for the speech model: says how much audio it was given, so tests need no model and no real voice.
export default async audio => `dictated ${audio.length >= 1600 ? 'words' : 'nothing'}`;
