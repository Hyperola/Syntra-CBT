import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

const PromotionHistory = ({ studentId }) => {
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef(null);

  const fetchPromotionHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/promotions/history/${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch promotion history');
      }

      const data = await response.json();
      console.log('Promotion history response:', data);
      if (data.success) {
        setPromotionHistory(data.history || []);
        setStudentInfo(data.student);
      } else {
        setError(data.message || 'No promotion history found');
      }
    } catch (err) {
      console.error('Error fetching promotion history:', err);
      setError('Failed to load promotion history');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    
    try {
      // Prepare data for export
      const exportData = promotionHistory.map((promotion, index) => ({
        'S/N': index + 1,
        'Date': promotion.promotionDateFormatted || 
                new Date(promotion.promotionDate).toLocaleDateString(),
        'Session': promotion.session || 'N/A',
        'From Class': promotion.previousClassName || 
                      promotion.previousClass?.name || 
                      'Unknown',
        'From Level': promotion.previousClassLevel || 'N/A',
        'To Class': promotion.newClassName || 
                    promotion.newClass?.name || 
                    'Unknown',
        'To Level': promotion.newClassLevel || 'N/A',
        'Promotion Type': promotion.promotionTypeLabel || 
                         (promotion.promotionType === 'standard' ? 'Automatic' : 
                          promotion.promotionType === 'manual_override' ? 'Manual' : 
                          promotion.promotionType === 'class_wide' ? 'Class-wide' : 'Regular'),
        'Promoted By': promotion.promotedByName || 
                       promotion.promotedBy?.username || 
                       'System',
        'Remarks': promotion.overrideReason || promotion.remarks || '-',
        'Promotion Date': new Date(promotion.promotionDate).toISOString().split('T')[0]
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const wscols = [
        { wch: 5 },   // S/N
        { wch: 15 },  // Date
        { wch: 12 },  // Session
        { wch: 20 },  // From Class
        { wch: 12 },  // From Level
        { wch: 20 },  // To Class
        { wch: 12 },  // To Level
        { wch: 15 },  // Promotion Type
        { wch: 20 },  // Promoted By
        { wch: 30 },  // Remarks
        { wch: 15 }   // Promotion Date
      ];
      ws['!cols'] = wscols;

      // Add header style (bold)
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E8F4FD" } }
        };
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Promotion History');

      // Add student info sheet
      if (studentInfo) {
        const studentData = [
          ['Student Information', ''],
          ['Name', studentInfo.name || 'N/A'],
          ['Student ID', studentInfo.studentId || 'N/A'],
          ['Email', studentInfo.email || 'N/A'],
          ['Current Class', studentInfo.currentClass?.name || 'Not assigned'],
          ['Admission Date', studentInfo.admissionDate ? 
           new Date(studentInfo.admissionDate).toLocaleDateString() : 'N/A'],
          ['Total Promotions', promotionHistory.length],
          ['First Promotion', promotionHistory.length > 0 ? 
           (promotionHistory[promotionHistory.length - 1].promotionDateFormatted || 
            new Date(promotionHistory[promotionHistory.length - 1].promotionDate).toLocaleDateString()) : 'Never'],
          ['Latest Promotion', promotionHistory.length > 0 ? 
           (promotionHistory[0].promotionDateFormatted || 
            new Date(promotionHistory[0].promotionDate).toLocaleDateString()) : 'Never']
        ];

        const ws2 = XLSX.utils.aoa_to_sheet(studentData);
        const wscols2 = [
          { wch: 20 },
          { wch: 30 }
        ];
        ws2['!cols'] = wscols2;

        // Style student info sheet
        for (let C = 0; C < 2; ++C) {
          for (let R = 0; R < studentData.length; ++R) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws2[address]) {
              if (R === 0) {
                ws2[address].s = {
                  font: { bold: true, size: 14 },
                  fill: { fgColor: { rgb: "E8F4FD" } }
                };
              }
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, ws2, 'Student Info');
      }

      // Generate filename
      const studentName = studentInfo?.name || 'Student';
      const filename = `Promotion_History_${studentName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save the file
      XLSX.writeFile(wb, filename);
      
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export promotion history. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    // This is a simple implementation - you might want to use a proper PDF library like jsPDF
    // For now, we'll use window.print() for basic PDF export
    
    window.print();
  };

  const exportToCSV = () => {
    try {
      // Prepare CSV content
      const headers = ['Date', 'Session', 'From Class', 'To Class', 'Promotion Type', 'Promoted By', 'Remarks'];
      const rows = promotionHistory.map(promotion => [
        promotion.promotionDateFormatted || new Date(promotion.promotionDate).toLocaleDateString(),
        promotion.session || 'N/A',
        promotion.previousClassName || promotion.previousClass?.name || 'Unknown',
        promotion.newClassName || promotion.newClass?.name || 'Unknown',
        promotion.promotionTypeLabel || (promotion.promotionType === 'standard' ? 'Automatic' : 'Manual'),
        promotion.promotedByName || promotion.promotedBy?.username || 'System',
        promotion.overrideReason || promotion.remarks || '-'
      ]);

      // Convert to CSV string
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const studentName = studentInfo?.name || 'Student';
      const filename = `Promotion_History_${studentName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      alert('Failed to export promotion history as CSV. Please try again.');
    }
  };

  const copyToClipboard = async () => {
    try {
      // Create a formatted text representation
      const text = promotionHistory.map((promotion, index) => 
        `${index + 1}. ${promotion.promotionDateFormatted || new Date(promotion.promotionDate).toLocaleDateString()} - From: ${promotion.previousClassName || 'Unknown'} To: ${promotion.newClassName || 'Unknown'} (${promotion.promotionTypeLabel || 'Regular'})`
      ).join('\n');

      await navigator.clipboard.writeText(text);
      alert('Promotion history copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchPromotionHistory();
    }
  }, [studentId]);

  if (loading) {
    return <div style={styles.loading}>
      <div style={styles.spinner}></div>
      Loading promotion history...
    </div>;
  }

  if (error) {
    return <div style={styles.error}>
      <div style={styles.errorIcon}>⚠️</div>
      <div>{error}</div>
      <button 
        onClick={fetchPromotionHistory}
        style={styles.retryButton}
      >
        Retry
      </button>
    </div>;
  }

  if (promotionHistory.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📋</div>
        <p>No promotion history available for this student.</p>
        <p>The student may not have been promoted yet or is in their original class.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Export Controls */}
      <div style={styles.exportControls}>
        <div style={styles.exportTitle}>
          <h3 style={styles.title}>Promotion History</h3>
          {studentInfo && (
            <div style={styles.studentInfo}>
              <span style={styles.studentName}>{studentInfo.name}</span>
              <span style={styles.studentId}>ID: {studentInfo.studentId}</span>
            </div>
          )}
        </div>
        
        <div style={styles.exportButtons}>
          <button
            onClick={exportToExcel}
            disabled={exporting}
            style={{...styles.exportButton, ...styles.excelButton}}
          >
            {exporting ? 'Exporting...' : '📊 Export Excel'}
          </button>
          
          <button
            onClick={exportToPDF}
            style={{...styles.exportButton, ...styles.pdfButton}}
          >
            📄 Export PDF
          </button>
          
          <button
            onClick={exportToCSV}
            style={{...styles.exportButton, ...styles.csvButton}}
          >
            📋 Export CSV
          </button>
          
          <button
            onClick={copyToClipboard}
            style={{...styles.exportButton, ...styles.clipboardButton}}
          >
            📋 Copy Summary
          </button>
        </div>
      </div>

      {/* History Table */}
      <div style={styles.tableContainer} ref={tableRef}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>S/N</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Session</th>
              <th style={styles.th}>From Class</th>
              <th style={styles.th}>To Class</th>
              <th style={styles.th}>Promotion Type</th>
              <th style={styles.th}>Promoted By</th>
              <th style={styles.th}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {promotionHistory.map((promotion, index) => (
              <tr key={index} style={styles.tr}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>
                  {promotion.promotionDateFormatted || 
                   new Date(promotion.promotionDate).toLocaleDateString()}
                </td>
                <td style={styles.td}>{promotion.session}</td>
                <td style={styles.td}>
                  {promotion.previousClassName || 
                   promotion.previousClass?.name || 
                   'Unknown'}
                </td>
                <td style={styles.td}>
                  {promotion.newClassName || 
                   promotion.newClass?.name || 
                   'Unknown'}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: promotion.promotionType === 'standard' 
                      ? '#28a745' 
                      : promotion.promotionType === 'manual_override'
                      ? '#ffc107'
                      : promotion.promotionType === 'class_wide'
                      ? '#17a2b8'
                      : '#6c757d'
                  }}>
                    {promotion.promotionTypeLabel || 
                     (promotion.promotionType === 'standard' ? 'Automatic' : 
                      promotion.promotionType === 'manual_override' ? 'Manual' : 
                      promotion.promotionType === 'class_wide' ? 'Class-wide' : 'Regular')}
                  </span>
                </td>
                <td style={styles.td}>
                  {promotion.promotedByName || 
                   promotion.promotedBy?.username || 
                   'System'}
                </td>
                <td style={styles.td}>
                  {promotion.overrideReason || promotion.remarks || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total Promotions:</span>
          <span style={styles.summaryValue}>{promotionHistory.length}</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>First Promotion:</span>
          <span style={styles.summaryValue}>
            {promotionHistory.length > 0 
              ? (promotionHistory[promotionHistory.length - 1].promotionDateFormatted ||
                 new Date(promotionHistory[promotionHistory.length - 1].promotionDate).toLocaleDateString())
              : 'N/A'}
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Latest Promotion:</span>
          <span style={styles.summaryValue}>
            {promotionHistory.length > 0 
              ? (promotionHistory[0].promotionDateFormatted ||
                 new Date(promotionHistory[0].promotionDate).toLocaleDateString())
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Print Styles (hidden in normal view) */}
      <style jsx="true">{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          #promotion-history-print, #promotion-history-print * {
            visibility: visible;
          }
          
          #promotion-history-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    margin: '20px 0',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '10px'
  },
  exportControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  exportTitle: {
    flex: 1
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#495057'
  },
  studentId: {
    fontSize: '14px',
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  exportButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  exportButton: {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  excelButton: {
    backgroundColor: '#28a745',
    color: 'white',
    ':hover': {
      backgroundColor: '#218838'
    },
    ':disabled': {
      backgroundColor: '#6c757d',
      cursor: 'not-allowed'
    }
  },
  pdfButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    ':hover': {
      backgroundColor: '#c82333'
    }
  },
  csvButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    ':hover': {
      backgroundColor: '#138496'
    }
  },
  clipboardButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    ':hover': {
      backgroundColor: '#5a6268'
    }
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    padding: '12px 15px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontWeight: '600',
    color: '#495057',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '12px 15px',
    borderBottom: '1px solid #dee2e6',
    color: '#495057',
    verticalAlign: 'middle'
  },
  tr: {
    ':hover': {
      backgroundColor: '#f8f9fa'
    }
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    textTransform: 'capitalize'
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    flexWrap: 'wrap',
    gap: '15px'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '150px'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6c757d',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    '@keyframes spin': {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' }
    }
  },
  error: {
    padding: '30px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px'
  },
  errorIcon: {
    fontSize: '40px'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.3s ease',
    ':hover': {
      backgroundColor: '#b91c1c'
    }
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px dashed #dee2e6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px'
  },
  emptyIcon: {
    fontSize: '50px',
    opacity: '0.5'
  }
};

export default PromotionHistory;