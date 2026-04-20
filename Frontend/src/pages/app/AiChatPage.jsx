import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import ToastMessage from '../../components/common/ToastMessage';
import { aiService, getAiProviderWarning } from '../../services/aiService';
import { apiRequestService } from '../../services/apiRequestService';

function AiChatPage() {
  const [apiRequests, setApiRequests] = useState([]);
  const [selectedApiRequestId, setSelectedApiRequestId] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [providerWarning, setProviderWarning] = useState('');
  const scrollAnchorRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello, I can help explain failed requests, suggest fixes, and improve your test coverage.',
    },
  ]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await apiRequestService.listMine();
        setApiRequests(list);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load API requests');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const onInputChange = (event) => {
    setInput(event.target.value);
  };

  const getBubbleClassName = (role) => {
    return role === 'user'
      ? 'bg-slate-900 text-white shadow-sm'
      : 'bg-white text-slate-700 border border-slate-200 shadow-sm';
  };

  const getWrapperClassName = (role) => {
    return role === 'user' ? 'flex justify-end' : 'flex justify-start';
  };

  const send = async () => {
    if (!input.trim()) {
      return;
    }

    const currentInput = input;
    const userMessage = { role: 'user', content: currentInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setProviderWarning('');
    setSending(true);

    try {
      const payload = {
        message: currentInput,
      };

      if (selectedApiRequestId) {
        payload.apiRequestId = Number(selectedApiRequestId);
      }

      const response = await aiService.chat(payload);
      setProviderWarning(getAiProviderWarning(response.rawModelResponse || response.answer));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
        },
      ]);
    } catch (chatError) {
      setError(chatError.message || 'Failed to send chat message');
    } finally {
      setSending(false);
    }
  };

  const onInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const renderAssistantContent = (content) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-6">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          code: ({ inline, children }) => inline
            ? <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-800">{children}</code>
            : (
              <pre className="my-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {content || ''}
      </ReactMarkdown>
    );
  };

  if (loading) {
    return <LoadingState text="Loading AI chat..." />;
  }

  return (
    <Card title="AI Assistant" subtitle="Ask questions about failed requests and next steps">
      {!apiRequests.length ? (
        <EmptyState
          title="No API requests linked"
          description="You can still chat now, or create requests first for better answers."
        />
      ) : (
        <div className="mb-3">
          <label className="field-label">Request Context (Optional)</label>
          <select
            className="field-input"
            value={selectedApiRequestId}
            onChange={(event) => setSelectedApiRequestId(event.target.value)}
          >
            <option value="">No request selected</option>
            {apiRequests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.httpMethod})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 h-[55vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={getWrapperClassName(message.role)}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${getBubbleClassName(message.role)}`}>
                {message.role === 'assistant' ? (
                  renderAssistantContent(message.content)
                ) : (
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex justify-start">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                Thinking...
              </div>
            </div>
          ) : null}
          <div ref={scrollAnchorRef} />
        </div>
      </div>

      <ToastMessage type="error" text={error} onClose={() => setError('')} />
      <ToastMessage type="info" text={providerWarning} onClose={() => setProviderWarning('')} />

      <div className="flex gap-2">
        <textarea
          className="field-input min-h-[72px]"
          placeholder="Ask AI what went wrong and how to fix it..."
          value={input}
          onChange={onInputChange}
          onKeyDown={onInputKeyDown}
          rows={3}
        />
        <Button onClick={send} disabled={sending}>
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </Card>
  );
}

export default AiChatPage;
