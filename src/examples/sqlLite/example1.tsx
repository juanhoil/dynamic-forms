import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { Save } from 'lucide-react';
import FormPlayground from '../../layouts/FormPlayground';
import { initDb, listForms, saveForm, deleteForm, type FormRow } from './db';
import SavedFormsTable from './SavedFormsTable';

/**
 * SQLite Example 1 — persist RJSF forms in a client-side SQLite database.
 *
 * How it works
 * ------------
 * - The current schema + uiSchema are stored in a local SQLite table called
 *   `form` (columns: schema, uischema, name, description, id, created_at).
 * - The SQLite file is persisted in the browser's IndexedDB via
 *   `IDBBatchAtomicVFS`, so data survives page reloads.
 * - There is no server. The data lives ONLY in this browser. It is not
 *   shared across devices, users or browsers, and is wiped if the user
 *   clears site data.
 */

const initialSchema = {
  title: 'Formulario SQLite Demo',
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      title: 'Nombre',
      minLength: 1,
    },
    age: {
      type: 'number',
      title: 'Edad',
      minimum: 0,
      maximum: 120,
    },
    role: {
      type: 'string',
      title: 'Rol',
      enum: ['admin', 'editor', 'viewer'],
      enumNames: ['Administrador', 'Editor', 'Visualizador'],
    },
    active: {
      type: 'boolean',
      title: 'Activo',
      default: true,
    },
  },
};

const initialUiSchema = {
  name: { 'ui:autofocus': true },
  role: { 'ui:widget': 'radio' },
};

const initialFormData = {
  name: '',
  age: 25,
  active: true,
};

const SqliteExample1: React.FC = () => {
  const [schema, setSchema] = useState<unknown>(initialSchema);
  const [uiSchema, setUiSchema] = useState<unknown>(initialUiSchema);
  const [, /* formData */ setFormData] = useState<unknown>(initialFormData);

  const [rows, setRows] = useState<FormRow[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialise SQLite on first mount and load any rows that already exist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDb();
        const existing = await listForms();
        if (cancelled) return;
        setRows(existing);
        setDbReady(true);
      } catch (err) {
        if (cancelled) return;
        setDbError(String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setRows(await listForms());
  }, []);

  const handleSubmit = (formData: unknown) => {
    setFormData(formData);
    // We don't auto-save on submit — saving is explicit via the button so
    // the user chooses the name/description.
    // eslint-disable-next-line no-console
    console.log('submit (not persisted automatically):', formData);
  };

  const handleSaveClick = () => {
    setName('');
    setDescription('');
    setDialogOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveForm({
        schema,
        uiSchema,
        name: name.trim(),
        description: description.trim(),
      });
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      setDbError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (row: FormRow) => {
    try {
      setSchema(JSON.parse(row.schema));
      setUiSchema(JSON.parse(row.uischema));
    } catch (err) {
      setDbError(`Failed to parse row ${row.id}: ${String(err)}`);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteForm(id);
      await refresh();
    } catch (err) {
      setDbError(String(err));
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">SQLite Example 1 — Persist RJSF Forms</h1>
        <p className="page-description">
          Saves the current schema, uiSchema, name and description into a
          client-side SQLite database (file persisted in this browser only).
          Edit the form, click <b>Save Form</b>, then reload the page — the
          rows are still there.
        </p>
      </div>

      {dbError && (
        <Alert severity="error" style={{ marginBottom: '1rem' }}>
          {dbError}
        </Alert>
      )}

      <Stack
        direction="row"
        justifyContent="flex-end"
        style={{ marginBottom: '1rem' }}
      >
        <Button
          variant="contained"
          startIcon={<Save size={16} />}
          disabled={!dbReady}
          onClick={handleSaveClick}
        >
          Save Form
        </Button>
      </Stack>

      <FormPlayground
        title="Live RJSF Form"
        description="Edit the schema / uiSchema or fill the form, then click Save Form to persist it into the SQLite `form` table."
        initialSchema={initialSchema}
        initialUiSchema={initialUiSchema}
        initialFormData={initialFormData}
        onSubmit={handleSubmit}
        onSchemaChange={setSchema}
        onUiSchemaChange={setUiSchema}
      />

      <h2 className="panel-title" style={{ marginTop: '2rem' }}>
        Saved Forms (from SQLite)
      </h2>
      <SavedFormsTable
        rows={rows}
        loading={!dbReady && !dbError}
        onLoad={handleLoad}
        onDelete={handleDelete}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Save current form</DialogTitle>
        <DialogContent>
          <Stack spacing={2} style={{ marginTop: 8 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveConfirm}
            disabled={!name.trim() || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SqliteExample1;
