import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Tooltip,
  Paper,
} from '@mui/material';
import { Download, Trash2 } from 'lucide-react';
import type { FormRow } from './db';

interface SavedFormsTableProps {
  rows: FormRow[];
  loading: boolean;
  onLoad: (row: FormRow) => void;
  onDelete: (id: number) => void;
}

/**
 * Read-only list of rows saved in the SQLite `form` table, with
 * Load / Delete actions on each row. Self-contained — no fetch logic
 * inside, all data flows from the parent.
 */
const SavedFormsTable: React.FC<SavedFormsTableProps> = ({
  rows,
  loading,
  onLoad,
  onDelete,
}) => {
  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <CircularProgress size={20} />
        <span style={{ marginLeft: 8, color: '#6b7280' }}>Loading…</span>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <Paper variant="outlined" style={{ padding: '1rem', color: '#6b7280' }}>
        No saved forms yet. Fill the form above and click <b>Save Form</b> to
        insert a row into the <code>form</code> table.
      </Paper>
    );
  }

  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell style={{ width: 60 }}>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell style={{ width: 180 }}>Created at</TableCell>
            <TableCell align="right" style={{ width: 120 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.id}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>
                {row.description || (
                  <span style={{ color: '#9ca3af' }}>—</span>
                )}
              </TableCell>
              <TableCell>{row.created_at}</TableCell>
              <TableCell align="right">
                <Tooltip title="Load into the playground">
                  <IconButton size="small" onClick={() => onLoad(row)}>
                    <Download size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(row.id)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default SavedFormsTable;
