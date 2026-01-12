
declare const google: any;

export class YouTubeService {
  private static SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';

  private static getStoredClientId(): string | null {
    return localStorage.getItem('yt_client_id');
  }

  static isConfigured(): boolean {
    const id = this.getStoredClientId();
    return !!id && id !== 'YOUR_GOOGLE_CLIENT_ID' && id.length > 10;
  }

  static setClientId(id: string) {
    localStorage.setItem('yt_client_id', id.trim());
  }

  static logout() {
    localStorage.removeItem('yt_access_token');
    localStorage.removeItem('yt_channel_info');
  }

  static async getChannelInfo(token: string) {
    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const info = {
          title: data.items[0].snippet.title,
          thumbnail: data.items[0].snippet.thumbnails.default.url
        };
        localStorage.setItem('yt_channel_info', JSON.stringify(info));
        return info;
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch channel info", e);
      return null;
    }
  }

  static async authorize(): Promise<{token: string, channel: any}> {
    const clientId = this.getStoredClientId();
    
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      throw new Error('Google Client ID is not configured. Please add it in settings.');
    }

    if (typeof google === 'undefined' || !google.accounts) {
      throw new Error('Google Identity Services script not loaded. Please wait a moment or check your connection.');
    }

    return new Promise((resolve, reject) => {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: this.SCOPES,
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(`Auth Error: ${response.error_description || response.error}`));
            } else if (response.access_token) {
              const token = response.access_token;
              localStorage.setItem('yt_access_token', token);
              const channel = await this.getChannelInfo(token);
              resolve({ token, channel });
            } else {
              reject(new Error('No access token received. Please try again.'));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(`Login failed: ${err.message || 'Check your Client ID and Authorized JavaScript Origins.'}`));
          }
        });
        
        // Forces Gmail and Channel selection
        client.requestAccessToken({ prompt: 'select_account consent' });
      } catch (err: any) {
        reject(new Error(`Request Error: ${err.message}. Ensure your Client ID is valid.`));
      }
    });
  }

  static async uploadShort(blob: Blob, metadata: { title: string; description: string; tags: string[] }, token: string) {
    const metadataObj = {
      snippet: {
        title: metadata.title.substring(0, 100),
        description: metadata.description,
        tags: metadata.tags,
        categoryId: '22',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadataObj)], { type: 'application/json' })
    );
    form.append('video', blob);

    const response = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (response.status === 401) {
      this.logout();
      throw new Error('YouTube session expired. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return await response.json();
  }
}
