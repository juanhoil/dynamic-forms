import React, { useState } from 'react';

/**
 * ChatExample1 - Ejemplo básico de chat
 * Muestra cómo crear un componente de chat simple
 */
const ChatExample1 = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: '¡Hola! Bienvenido al chat de ejemplo.', sender: 'bot', timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simular respuesta del bot
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: `Recibido: "${inputValue}"`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Chat Ejemplo 1</h1>
        <p className="page-description">
          Ejemplo básico de un componente de chat
        </p>
      </div>

      <div className="panel">
        <div
          style={{
            height: '400px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#f5f5f5',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  backgroundColor: msg.sender === 'user' ? '#1976d2' : '#ffffff',
                  color: msg.sender === 'user' ? '#ffffff' : '#333333',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <p style={{ margin: 0 }}>{msg.text}</p>
                <small
                  style={{
                    display: 'block',
                    marginTop: '0.25rem',
                    opacity: 0.7,
                    fontSize: '0.75rem',
                  }}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </small>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe un mensaje..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '1rem',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#1976d2',
              color: '#ffffff',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#1565c0')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#1976d2')}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatExample1;
