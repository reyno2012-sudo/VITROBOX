import React, { useState } from 'react';
import { Track } from '../types';
import { parseLrc } from '../utils/lrcParser';
import { PRESET_TRACKS } from '../constants/presets';
import { Upload, Music, Link2, FileText, X, Check, Disc3 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: Track) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'file' | 'url'>('presets');
  const [dragOver, setDragOver] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lrcFile, setLrcFile] = useState<File | null>(null);
  const [lrcText, setLrcText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Handle Drag & Drop of Audio & LRC files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setErrorMsg('');

    const files = Array.from(e.dataTransfer.files);
    let detectedAudio: File | null = null;
    let detectedLrc: File | null = null;

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(ext || '')) {
        detectedAudio = file;
      } else if (ext === 'lrc' || ext === 'txt') {
        detectedLrc = file;
      }
    }

    if (detectedAudio) {
      setAudioFile(detectedAudio);
      // Auto-extract track title & artist from filename
      const cleanName = detectedAudio.name.replace(/\.[^/.]+$/, '');
      if (cleanName.includes('-')) {
        const [ar, ti] = cleanName.split('-');
        setCustomArtist(ar.trim());
        setCustomTitle(ti.trim());
      } else {
        setCustomTitle(cleanName);
        setCustomArtist('Local Audio');
      }
    }

    if (detectedLrc) {
      setLrcFile(detectedLrc);
      const text = await detectedLrc.text();
      setLrcText(text);
    }
  };

  const handleAudioFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (cleanName.includes('-')) {
        const [ar, ti] = cleanName.split('-');
        setCustomArtist(ar.trim());
        setCustomTitle(ti.trim());
      } else {
        setCustomTitle(cleanName);
        setCustomArtist('Local Audio');
      }
    }
  };

  const handleLrcFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLrcFile(file);
      const text = await file.text();
      setLrcText(text);
    }
  };

  const handleConfirmCustom = () => {
    const selectedFile = activeTab === 'file' ? audioFile : null;
    const selectedUrl = activeTab === 'url' ? urlInput.trim() : '';
    if (!selectedFile && !selectedUrl) {
      setErrorMsg('请选择本地音频文件或输入音频链接');
      return;
    }

    const audioUrl = selectedFile ? URL.createObjectURL(selectedFile) : selectedUrl;
    let parsedLyrics = lrcText ? parseLrc(lrcText).lines : [];

    // Fallback poetic lyrics if no LRC provided
    if (parsedLyrics.length === 0) {
      parsedLyrics = [
        { id: 'c-1', time: 1.0, text: customTitle || 'Now Playing', highlightWords: [customTitle || 'Playing'], layoutStyle: 'top_right' },
        { id: 'c-2', time: 6.0, text: `${customArtist || 'Unknown Artist'} · High Fidelity Audio`, highlightWords: ['Fidelity'], layoutStyle: 'bottom_left' },
        { id: 'c-3', time: 12.0, text: '水波轻抚 透明箱体泛起层层声学涟漪', highlightWords: ['水波', '涟漪'], layoutStyle: 'top_right' },
        { id: 'c-4', time: 18.0, text: '低音沉浸 悬浮空间随律动呼吸', highlightWords: ['低音', '悬浮'], layoutStyle: 'bottom_left' },
        { id: 'c-5', time: 24.0, text: '音符如微光在透明水体中流动', highlightWords: ['微光', '流动'], layoutStyle: 'top_right' },
        { id: 'c-6', time: 32.0, text: 'VITROBOX V1 · 空间悬浮歌词音响', highlightWords: ['VITROBOX', 'V1'], layoutStyle: 'bottom_left' },
      ];
    }

    const newTrack: Track = {
      id: `custom-${Date.now()}`,
      title: customTitle || '自定义曲目',
      artist: customArtist || '本地音频',
      duration: 240,
      audioUrl,
      lyrics: parsedLyrics,
    };

    onSelectTrack(newTrack);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#14171a] border border-[#2d333b] rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242930] bg-[#1a1d22]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#252b33] border border-[#3b434f] flex items-center justify-center text-[#38bdf8]">
              <Disc3 className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white font-sans">
                音频与歌词载入 (Audio & Lyrics)
              </h3>
              <p className="text-xs text-[#8c96a3]">
                拖拽本地歌曲、LRC歌词或选择内置官方经典曲目
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#252b33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#242930] bg-[#121417] px-6">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'presets'
                ? 'border-[#38bdf8] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            经典曲目 (Presets)
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-[#38bdf8] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            拖入本地音频 (Local File / LRC)
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'url'
                ? 'border-[#38bdf8] text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            音频外链 (Audio URL)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              <div className="text-xs text-[#9aa4b0] mb-3">
                精选与 VITROBOX V1 极度适配的动态空间歌词曲目：
              </div>
              <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {PRESET_TRACKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTrack(t);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#1a1e24] hover:bg-[#222730] border border-[#2e3540] hover:border-[#38bdf8]/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-[#272e38] border border-[#37404d] flex items-center justify-center text-[#38bdf8] group-hover:scale-105 transition-transform">
                        <Music className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                          {t.title}
                        </div>
                        <div className="text-xs text-[#8c96a3]">
                          {t.artist} {t.album ? `· ${t.album}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[#6c7684] group-hover:text-white">
                      {t.lyrics.length} 句空间歌词
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL DRAG & DROP FILE */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-[#38bdf8] bg-[#38bdf8]/10'
                    : 'border-[#343b46] hover:border-[#4d5666] bg-[#181c22]'
                }`}
              >
                <Upload className="w-8 h-8 text-[#38bdf8] mx-auto mb-2" />
                <div className="text-sm font-medium text-white mb-1">
                  拖拽歌曲或 .LRC 歌词文件到此处
                </div>
                <div className="text-xs text-[#808b99]">
                  支持 MP3, WAV, FLAC, M4A, OGG 及标准 LRC 同步歌词
                </div>

                <div className="flex justify-center gap-4 mt-4">
                  <label className="px-3.5 py-1.5 bg-[#252c36] hover:bg-[#303845] text-xs font-medium text-neutral-200 rounded-lg cursor-pointer border border-[#3b4452] transition-colors">
                    选择音频文件
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleAudioFileInput}
                    />
                  </label>
                  <label className="px-3.5 py-1.5 bg-[#252c36] hover:bg-[#303845] text-xs font-medium text-neutral-200 rounded-lg cursor-pointer border border-[#3b4452] transition-colors">
                    导入 LRC 歌词
                    <input
                      type="file"
                      accept=".lrc,.txt"
                      className="hidden"
                      onChange={handleLrcFileInput}
                    />
                  </label>
                </div>
              </div>

              {/* Status of selected files */}
              <div className="space-y-2">
                {audioFile && (
                  <div className="flex items-center justify-between p-2.5 bg-[#1b2027] border border-[#2b333e] rounded-lg text-xs">
                    <span className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-4 h-4" /> 音频已就绪: {audioFile.name}
                    </span>
                    <span className="text-neutral-400">
                      {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                )}
                {lrcFile && (
                  <div className="flex items-center justify-between p-2.5 bg-[#1b2027] border border-[#2b333e] rounded-lg text-xs">
                    <span className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-4 h-4" /> 歌词已就绪: {lrcFile.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Track Metadata Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#8a95a3] mb-1">
                    歌曲名称 (Title)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="输入或自动解析"
                    className="w-full px-3 py-1.5 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#8a95a3] mb-1">
                    歌手名称 (Artist)
                  </label>
                  <input
                    type="text"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    placeholder="输入或自动解析"
                    className="w-full px-3 py-1.5 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              {/* Optional LRC text paste area */}
              <div>
                <label className="block text-[11px] font-mono text-[#8a95a3] mb-1">
                  或直接粘贴 LRC 歌词文本 (支持 [00:12.34] 时间轴)
                </label>
                <textarea
                  value={lrcText}
                  onChange={(e) => setLrcText(e.target.value)}
                  placeholder="[00:01.00] 歌词第一句...&#10;[00:06.50] 歌词第二句..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs font-mono text-neutral-300 focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  音频直链 (Direct Audio URL)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/audio.mp3"
                      className="w-full pl-9 pr-3 py-2 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#8a95a3] mb-1">
                    歌曲名称 (Title)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="例如：City Lights"
                    className="w-full px-3 py-1.5 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#8a95a3] mb-1">
                    歌手名称 (Artist)
                  </label>
                  <input
                    type="text"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    placeholder="例如：Electronic Dream"
                    className="w-full px-3 py-1.5 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8a95a3] mb-1">
                  粘贴 LRC 歌词 (可选)
                </label>
                <textarea
                  value={lrcText}
                  onChange={(e) => setLrcText(e.target.value)}
                  placeholder="[00:01.00] 歌词第一句...&#10;[00:06.50] 歌词第二句..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[#16191f] border border-[#2c333e] rounded-lg text-xs font-mono text-neutral-300 focus:outline-none focus:border-[#38bdf8]"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 text-xs text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab !== 'presets' && (
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-[#242930] bg-[#16191e]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmCustom}
              className="px-5 py-1.5 text-xs font-semibold text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-lg transition-colors shadow-md"
            >
              载入并开始播放
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
