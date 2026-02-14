-- Allow 'draw' in predictions table
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_prediction_check;
ALTER TABLE public.predictions ADD CONSTRAINT predictions_prediction_check CHECK (prediction IN ('red', 'blue', 'draw'));
