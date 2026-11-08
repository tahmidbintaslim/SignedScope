import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button, Dialog, Field, Input, Menu, Tabs, useToast } from '../ui';
import { renderUI } from './render';

describe('Button', () => {
  it('shows progress without changing size and ignores presses while loading', async () => {
    const onClick = vi.fn();
    renderUI(<Button loading onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('links the label, hint and error to the input', () => {
    renderUI(<Field label="Email" hint="We never share it" error="Enter an email"><Input /></Field>);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it Enter an email');
  });
});

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Send it?" description="Rafi gets a link.">
        <Button data-autofocus>Send</Button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('traps focus, closes on Escape and returns focus to the opener', async () => {
    renderUI(<DialogDemo />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    const dlg = screen.getByRole('dialog', { name: 'Send it?' });
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    expect(dlg).toHaveAccessibleDescription('Rafi gets a link.');
    expect(screen.getByRole('button', { name: 'Send' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(dlg.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});

function ToastDemo() {
  const toast = useToast();
  return <Button onClick={() => toast({ title: 'Link copied', tone: 'success' })}>Copy</Button>;
}

describe('Toast', () => {
  it('announces in a live region and can be closed', async () => {
    renderUI(<ToastDemo />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(region).toHaveTextContent('Link copied');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(region).not.toHaveTextContent('Link copied'));
  });
});

function TabsDemo() {
  const [v, setV] = useState('a');
  return <Tabs label="Sections" value={v} onChange={setV} items={[{ id: 'a', label: 'One', content: 'First' }, { id: 'b', label: 'Two', content: 'Second' }]} />;
}

describe('Tabs', () => {
  it('moves with arrow keys and shows the matching panel', async () => {
    renderUI(<TabsDemo />);
    screen.getByRole('tab', { name: 'One' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Second');
  });
});

describe('Menu', () => {
  it('opens on click, moves with arrows, runs the item and returns focus', async () => {
    const copy = vi.fn();
    renderUI(<Menu trigger={(p) => <Button {...p}>Actions</Button>} items={[{ label: 'Copy link', onSelect: copy }, { label: 'Delete', onSelect: () => {} }]} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(copy).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
  });
});

describe('Menu with choices', () => {
  it('marks the current choice with aria-checked', async () => {
    renderUI(<Menu trigger={(p) => <Button {...p}>Theme</Button>} items={[{ label: 'Light', checked: true, onSelect: () => {} }, { label: 'Dark', checked: false, onSelect: () => {} }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false');
  });
});
