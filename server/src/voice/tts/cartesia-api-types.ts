/** Voice selection */
export interface CartesiaVoice {
    mode: "id";
    id: string;
  }
  
  /** Audio format */
  export interface CartesiaOutputFormat {
    container: "raw";
    encoding: "pcm_s16le";
    sample_rate: number;
  }
  
  /** What we send to Cartesia */
  export interface CartesiaTTSRequest {
    model_id: string;
    transcript: string;
    voice: CartesiaVoice;
    output_format: CartesiaOutputFormat;
    language: string;
    context_id: string;
  }
  
  /** What Cartesia sends back */
  export interface CartesiaTTSResponse {
    data?: string;      // Base64 audio chunk
    done?: boolean;     // Is generation complete?
    error?: string;     // Error message if failed
  }