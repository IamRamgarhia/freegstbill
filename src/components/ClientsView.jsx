import { useState, useEffect } from 'react';
import { Users, Search, FileText, IndianRupee, Clock, ChevronDown, ChevronUp, Trash2, X, MessageCircle, Mail } from 'lucide-react';
import { getAllClients, getAllBills, deleteClient } from '../store';
import { formatCurrency, INVOICE_TYPES } from '../utils';
import { toast } from './Toast';

const STATUS_COLORS = {
  unpaid: { color: '#f59e0b', bg: '#fffbeb' },
  partial: { color: '#8b5cf6', bg: '#f5f3ff' },
  paid: { color: '#059669', bg: '#ecfdf5' },
  overdue: { color: '#dc2626', bg: '#fef2f2' },
};

export default function ClientsView({ onEdit, onDuplicate, onNew }) {
  const [clients, setClients] = useState([]);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [c, b] = await Promise.all([getAllClients(), getAllBills()]);
      setClients(c);
      setBills(b);
    } catch {
      toast('Failed to load data', 'error');
    }
  };

  // Group bills by client name
  const getClientBills = (clientName) => {
    return bills.filter(b => (b.clientName || '').toLowerCase() === clientName.toLowerCase())
      .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  };

  const getClientStats = (clientName) => {
    const cBills = getClientBills(clientName);
    const total = cBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const paid = cBills.reduce((s, b) => {
      if (b.status === 'paid') return s + (b.totalAmount || 0);
      if (b.status === 'partial') return s + (b.paidAmount || 0);
      return s;
    }, 0);
    const unpaid = total - paid;
    return { total, paid, unpaid, count: cBills.length };
  };

  // Get all unique client names from bills (includes unsaved clients)
  const allClientNames = [...new Set([
    ...clients.map(c => c.name),
    ...bills.map(b => b.clientName).filter(Boolean)
  ])];

  const filteredClients = search.trim()
    ? allClientNames.filter(name => name.toLowerCase().includes(search.toLowerCase()))
    : allClientNames;

  // Sort by outstanding amount
  const sortedClients = [...filteredClients].sort((a, b) => {
    const sa = getClientStats(a);
    const sb = getClientStats(b);
    return sb.unpaid - sa.unpaid;
  });

  const handleDeleteClient = async (id) => {
    if (confirm('Remove this saved client?')) {
      await deleteClient(id);
      toast('Client removed', 'success');
      loadData();
    }
  };

  const shareWhatsApp = (bill) => {
    const phone = bill.clientPhone ? bill.clientPhone.replace(/\D/g, '') : '';
    const msg = `*Invoice ${bill.invoiceNumber}*\nAmount: ${formatCurrency(bill.totalAmount)}\nDate: ${new Date(bill.invoiceDate).toLocaleDateString('en-IN')}\nStatus: ${(bill.status || 'unpaid').toUpperCase()}`;
    const encoded = encodeURIComponent(msg);

    const desktopUrl = `whatsapp://send?${phone ? `phone=${phone}&` : ''}text=${encoded}`;
    const webUrl = `https://web.whatsapp.com/send?${phone ? `phone=${phone}&` : ''}text=${encoded}`;

    window.open(desktopUrl, '_self');
    setTimeout(() => {
      if (!document.hidden) {
        window.open(webUrl, '_blank');
      }
    }, 1500);
  };

  const shareEmail = (bill) => {
    const subject = `Invoice ${bill.invoiceNumber}`;
    const body = `Dear ${bill.clientName},\n\nPlease find the details of your invoice:\n\nInvoice No: ${bill.invoiceNumber}\nAmount: ${formatCurrency(bill.totalAmount)}\nDate: ${new Date(bill.invoiceDate).toLocaleDateString('en-IN')}\nDue: ${bill.status === 'paid' ? 'Paid' : 'Pending'}\n\nRegards`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Client-wise invoice ledger and outstanding</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          <FileText size={18} /> New Invoice
        </button>
      </div>

      {/* Search */}
      <div className="glass-panel p-4 mb-6">
        <div className="search-box" style={{ maxWidth: '400px' }}>
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search clients..." value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" />
          {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
      </div>

      {/* Client cards */}
      {sortedClients.length === 0 ? (
        <div className="glass-panel p-6">
          <div className="empty-state">
            <Users size={48} />
            <p>No clients found.</p>
          </div>
        </div>
      ) : (
        <div className="client-list">
          {sortedClients.map(clientName => {
            const stats = getClientStats(clientName);
            const savedClient = clients.find(c => c.name === clientName);
            const isExpanded = expandedClient === clientName;
            const clientBills = isExpanded ? getClientBills(clientName) : [];

            return (
              <div key={clientName} className="glass-panel mb-4" style={{ overflow: 'hidden' }}>
                {/* Client header */}
                <div className="client-card-header" onClick={() => setExpandedClient(isExpanded ? null : clientName)}>
                  <div className="client-card-info">
                    <div className="client-avatar">
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="client-card-name">{clientName}</h3>
                      <p className="client-card-meta">
                        {stats.count} invoice{stats.count !== 1 ? 's' : ''}
                        {savedClient?.state ? ` | ${savedClient.state}` : ''}
                        {savedClient?.gstin ? ` | ${savedClient.gstin}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="client-card-stats">
                    <div className="client-stat">
                      <span className="client-stat-label">Total</span>
                      <span className="client-stat-value">{formatCurrency(stats.total)}</span>
                    </div>
                    <div className="client-stat">
                      <span className="client-stat-label">Paid</span>
                      <span className="client-stat-value" style={{ color: '#059669' }}>{formatCurrency(stats.paid)}</span>
                    </div>
                    <div className="client-stat">
                      <span className="client-stat-label">Outstanding</span>
                      <span className="client-stat-value" style={{ color: stats.unpaid > 0 ? '#dc2626' : '#059669' }}>
                        {formatCurrency(stats.unpaid)}
                      </span>
                    </div>
                    <div style={{ marginLeft: '0.5rem' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded: invoice list */}
                {isExpanded && (
                  <div className="client-invoices">
                    {clientBills.length === 0 ? (
                      <p className="text-muted" style={{ padding: '1rem 1.5rem', fontSize: '0.85rem' }}>No invoices for this client.</p>
                    ) : (
                      <table className="data-table" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Invoice No.</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientBills.map(bill => {
                            const sc = STATUS_COLORS[bill.status || 'unpaid'] || STATUS_COLORS.unpaid;
                            const isOverdue = (bill.status || 'unpaid') !== 'paid' && bill.data?.details?.dueDate && new Date(bill.data.details.dueDate) < new Date();
                            return (
                              <tr key={bill.id} style={isOverdue ? { background: '#fef2f2' } : {}}>
                                <td className="text-muted">{new Date(bill.invoiceDate).toLocaleDateString('en-IN')}</td>
                                <td><span className="invoice-badge">{bill.invoiceNumber}</span></td>
                                <td><span className="type-badge">{(INVOICE_TYPES[bill.invoiceType || 'tax-invoice'])?.label}</span></td>
                                <td className="font-bold">{formatCurrency(bill.totalAmount)}</td>
                                <td>
                                  <span className="status-badge" style={{ background: sc.bg, color: sc.color }}>
                                    {isOverdue ? 'Overdue' : (bill.status || 'unpaid').charAt(0).toUpperCase() + (bill.status || 'unpaid').slice(1)}
                                  </span>
                                </td>
                                <td>
                                  <div className="table-actions">
                                    {bill.data && (
                                      <button className="icon-btn icon-btn-blue" onClick={() => onEdit(bill)} title="Edit">
                                        <FileText size={14} />
                                      </button>
                                    )}
                                    <button className="icon-btn icon-btn-blue" onClick={() => onDuplicate(bill)} title="Duplicate">
                                      <FileText size={14} />
                                    </button>
                                    <button className="icon-btn icon-btn-green" onClick={() => shareWhatsApp(bill)} title="WhatsApp">
                                      <MessageCircle size={14} />
                                    </button>
                                    <button className="icon-btn icon-btn-blue" onClick={() => shareEmail(bill)} title="Email">
                                      <Mail size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {savedClient && (
                      <div className="client-actions-bar">
                        <button className="icon-btn icon-btn-red" onClick={() => handleDeleteClient(savedClient.id)} title="Remove saved client">
                          <Trash2 size={14} /> Remove Client
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
