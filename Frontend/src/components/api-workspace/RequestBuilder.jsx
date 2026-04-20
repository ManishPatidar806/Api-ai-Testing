import { useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import InputField from '../common/InputField';
import KeyValueEditor from './KeyValueEditor';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const BODY_TYPES = [
  { value: 'NONE', label: 'No Body' },
  { value: 'JSON', label: 'JSON' },
  { value: 'TEXT', label: 'Text' },
  { value: 'XML', label: 'XML' },
  { value: 'FORM_URLENCODED', label: 'x-www-form-urlencoded' },
  { value: 'MULTIPART_FORM_DATA', label: 'multipart/form-data' },
];

const AUTH_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'BEARER', label: 'Bearer Token' },
  { value: 'BASIC', label: 'Basic Auth' },
  { value: 'API_KEY', label: 'API Key' },
  { value: 'CUSTOM', label: 'Custom Authorization Header' },
];

const REQUEST_TABS = [
  { key: 'params', label: 'Params' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'auth', label: 'Auth' },
];

function RequestBuilder({ request, setRequest, onSend, sending, disabled = false }) {
  const [activeTab, setActiveTab] = useState('params');

  const updateRequestField = (field, value) => {
    setRequest({
      ...request,
      [field]: value,
    });
  };

  const onHeaderChange = (index, field, value) => {
    const next = [...request.headers];
    next[index] = { ...next[index], [field]: value };
    setRequest({
      ...request,
      headers: next,
    });
  };

  const addHeader = () => {
    setRequest({
      ...request,
      headers: [...request.headers, { key: '', value: '' }],
    });
  };

  const removeHeader = (index) => {
    const nextHeaders = request.headers.filter((_, i) => i !== index);
    setRequest({
      ...request,
      headers: nextHeaders,
    });
  };

  const onQueryParamChange = (index, field, value) => {
    const next = [...request.queryParams];
    next[index] = { ...next[index], [field]: value };
    setRequest({
      ...request,
      queryParams: next,
    });
  };

  const addQueryParam = () => {
    setRequest({
      ...request,
      queryParams: [...request.queryParams, { key: '', value: '' }],
    });
  };

  const removeQueryParam = (index) => {
    const next = request.queryParams.filter((_, i) => i !== index);
    setRequest({
      ...request,
      queryParams: next,
    });
  };

  const onFormBodyChange = (index, field, value) => {
    const next = [...request.formBody];
    next[index] = { ...next[index], [field]: value };
    setRequest({
      ...request,
      formBody: next,
    });
  };

  const addFormBodyField = () => {
    setRequest({
      ...request,
      formBody: [...request.formBody, { key: '', value: '' }],
    });
  };

  const removeFormBodyField = (index) => {
    const next = request.formBody.filter((_, i) => i !== index);
    setRequest({
      ...request,
      formBody: next,
    });
  };

  const onMultipartFieldChange = (index, field, value) => {
    const next = [...(request.multipartFields || [])];
    next[index] = { ...next[index], [field]: value };
    setRequest({
      ...request,
      multipartFields: next,
    });
  };

  const addMultipartField = () => {
    setRequest({
      ...request,
      multipartFields: [...(request.multipartFields || []), { key: '', value: '', kind: 'TEXT', fileName: '', fileContent: '', fileType: '' }],
    });
  };

  const removeMultipartField = (index) => {
    const next = (request.multipartFields || []).filter((_, i) => i !== index);
    setRequest({
      ...request,
      multipartFields: next,
    });
  };

  const onMultipartFileSelected = (index, file) => {
    if (!file) {
      onMultipartFieldChange(index, 'fileName', '');
      onMultipartFieldChange(index, 'fileContent', '');
      onMultipartFieldChange(index, 'fileType', '');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      const next = [...(request.multipartFields || [])];
      next[index] = {
        ...next[index],
        kind: 'FILE',
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileContent: base64,
      };
      setRequest({
        ...request,
        multipartFields: next,
      });
    };
    reader.readAsDataURL(file);
  };

  const renderAuthSection = () => {
    if (request.authType === 'BEARER') {
      return (
        <InputField
          label="Bearer Token"
          placeholder="eyJhbGciOi..."
          value={request.authBearerToken || ''}
          disabled={disabled}
          onChange={(event) => updateRequestField('authBearerToken', event.target.value)}
        />
      );
    }

    if (request.authType === 'BASIC') {
      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InputField
            label="Username"
            placeholder="admin"
            value={request.authBasicUsername || ''}
            disabled={disabled}
            onChange={(event) => updateRequestField('authBasicUsername', event.target.value)}
          />
          <InputField
            label="Password"
            type="password"
            placeholder="password"
            value={request.authBasicPassword || ''}
            disabled={disabled}
            onChange={(event) => updateRequestField('authBasicPassword', event.target.value)}
          />
        </div>
      );
    }

    if (request.authType === 'API_KEY') {
      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InputField
            label="Key Name"
            placeholder="x-api-key"
            value={request.authApiKeyName || ''}
            disabled={disabled}
            onChange={(event) => updateRequestField('authApiKeyName', event.target.value)}
          />
          <InputField
            label="Key Value"
            placeholder="your-secret-key"
            value={request.authApiKeyValue || ''}
            disabled={disabled}
            onChange={(event) => updateRequestField('authApiKeyValue', event.target.value)}
          />
          <div>
            <label className="field-label">Add To</label>
            <select
              className="field-input"
              value={request.authApiKeyIn || 'HEADER'}
              disabled={disabled}
              onChange={(event) => updateRequestField('authApiKeyIn', event.target.value)}
            >
              <option value="HEADER">Header</option>
              <option value="QUERY">Query Param</option>
            </select>
          </div>
        </div>
      );
    }

    if (request.authType === 'CUSTOM') {
      return (
        <InputField
          label="Authorization Header"
          placeholder="Bearer <token>"
          value={request.authHeader || ''}
          disabled={disabled}
          onChange={(event) => updateRequestField('authHeader', event.target.value)}
        />
      );
    }

    return <p className="text-xs text-slate-500">No auth helper will be applied.</p>;
  };

  return (
    <Card title="Request Builder" subtitle="Compose and execute API requests">
      <div className="space-y-4">
        <InputField
          label="Request Name"
          placeholder="Get User Profile"
          value={request.name}
          disabled={disabled}
          onChange={(event) => updateRequestField('name', event.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr]">
          <div>
            <label className="field-label">HTTP Method</label>
            <select
              className="field-input"
              value={request.method}
              disabled={disabled}
              onChange={(event) => updateRequestField('method', event.target.value)}
            >
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <InputField
            label="API URL"
            placeholder="https://api.example.com/v1/resource"
            value={request.url}
            disabled={disabled}
            onChange={(event) => updateRequestField('url', event.target.value)}
          />
        </div>

        <div className="rounded-lg border border-slate-200 p-2">
          <div className="mb-3 flex flex-wrap gap-2">
            {REQUEST_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                onClick={() => setActiveTab(tab.key)}
                disabled={disabled}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'params' ? (
            <div>
              <p className="field-label">Query Parameters</p>
              <KeyValueEditor
                rows={request.queryParams}
                onChange={onQueryParamChange}
                onAdd={addQueryParam}
                onRemove={removeQueryParam}
                disabled={disabled}
                keyPlaceholder="Query key"
                valuePlaceholder="Query value"
                addButtonLabel="Add Query Param"
              />
            </div>
          ) : null}

          {activeTab === 'headers' ? (
            <div>
              <p className="field-label">Headers</p>
              <KeyValueEditor
                rows={request.headers}
                onChange={onHeaderChange}
                onAdd={addHeader}
                onRemove={removeHeader}
                disabled={disabled}
                keyPlaceholder="Header key"
                valuePlaceholder="Header value"
                addButtonLabel="Add Header"
              />
            </div>
          ) : null}

          {activeTab === 'body' ? (
            <div className="space-y-3">
              <div>
                <label className="field-label">Body Type</label>
                <select
                  className="field-input"
                  value={request.bodyType}
                  disabled={disabled}
                  onChange={(event) => updateRequestField('bodyType', event.target.value)}
                >
                  {BODY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {request.bodyType === 'FORM_URLENCODED' ? (
                <div>
                  <p className="field-label">Form Fields (x-www-form-urlencoded)</p>
                  <KeyValueEditor
                    rows={request.formBody}
                    onChange={onFormBodyChange}
                    onAdd={addFormBodyField}
                    onRemove={removeFormBodyField}
                    disabled={disabled}
                    keyPlaceholder="Field key"
                    valuePlaceholder="Field value"
                    addButtonLabel="Add Form Field"
                  />
                </div>
              ) : null}

              {request.bodyType === 'MULTIPART_FORM_DATA' ? (
                <div className="space-y-3">
                  <p className="field-label">Multipart Fields</p>
                  {(request.multipartFields || []).map((row, index) => (
                    <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_auto]">
                        <InputField
                          placeholder="Field name"
                          value={row.key}
                          disabled={disabled}
                          onChange={(event) => onMultipartFieldChange(index, 'key', event.target.value)}
                        />
                        <select
                          className="field-input"
                          value={row.kind || 'TEXT'}
                          disabled={disabled}
                          onChange={(event) => onMultipartFieldChange(index, 'kind', event.target.value)}
                        >
                          <option value="TEXT">Text</option>
                          <option value="FILE">File</option>
                        </select>
                        <Button variant="secondary" className="h-fit" onClick={() => removeMultipartField(index)} disabled={disabled}>
                          Remove
                        </Button>
                      </div>

                      {(row.kind || 'TEXT') === 'FILE' ? (
                        <div className="space-y-1">
                          <input
                            type="file"
                            className="field-input"
                            disabled={disabled}
                            onChange={(event) => onMultipartFileSelected(index, event.target.files?.[0])}
                          />
                          <p className="text-xs text-slate-500">
                            {row.fileName ? `Selected: ${row.fileName}` : 'No file selected'}
                          </p>
                        </div>
                      ) : (
                        <InputField
                          placeholder="Field value"
                          value={row.value || ''}
                          disabled={disabled}
                          onChange={(event) => onMultipartFieldChange(index, 'value', event.target.value)}
                        />
                      )}
                    </div>
                  ))}
                  <Button variant="secondary" onClick={addMultipartField} disabled={disabled}>
                    Add Multipart Field
                  </Button>
                  <p className="text-xs text-slate-500">Files are encoded client-side and sent as multipart segments.</p>
                </div>
              ) : null}

              {request.bodyType !== 'NONE' && request.bodyType !== 'FORM_URLENCODED' && request.bodyType !== 'MULTIPART_FORM_DATA' ? (
                <div>
                  <label className="field-label">Request Body</label>
                  <textarea
                    className="json field-input min-h-48"
                    placeholder={request.bodyType === 'JSON' ? `{
  "key": "value"
}` : 'Request body content'}
                    value={request.body}
                    disabled={disabled}
                    onChange={(event) => updateRequestField('body', event.target.value)}
                  />
                </div>
              ) : null}

              {request.bodyType === 'NONE' ? (
                <p className="text-xs text-slate-500">No request body will be sent for this request.</p>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'auth' ? (
            <div className="space-y-3">
              <div>
                <label className="field-label">Auth Type</label>
                <select
                  className="field-input"
                  value={request.authType || 'NONE'}
                  disabled={disabled}
                  onChange={(event) => updateRequestField('authType', event.target.value)}
                >
                  {AUTH_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              {renderAuthSection()}
            </div>
          ) : null}
        </div>

        <InputField
          label="Description"
          placeholder="Optional note about this endpoint"
          value={request.description}
          disabled={disabled}
          onChange={(event) => updateRequestField('description', event.target.value)}
        />

        <p className="text-xs text-slate-500">Send will automatically save and execute this request.</p>

        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={onSend} disabled={sending || disabled}>
            {sending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default RequestBuilder;
