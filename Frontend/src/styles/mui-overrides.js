// Material UI Component Style Overrides
export const muiComponentOverrides = {
  // Button Component Overrides
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '0.875rem',
        textTransform: 'none',
        fontWeight: 600,
        padding: '0.75rem 1.75rem',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 20px -5px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.04)',
        },
        '&:active': {
          transform: 'translateY(-1px)',
        },
        '&.Mui-disabled': {
          opacity: 0.5,
        },
      },
      sizeSmall: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
      },
      sizeLarge: {
        padding: '0.875rem 2rem',
        fontSize: '1.125rem',
      },
      containedPrimary: {
        background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
          boxShadow: '0 6px 20px rgba(14, 165, 233, 0.4)',
        },
      },
      containedSecondary: {
        background: 'linear-gradient(135deg, #d946ef 0%, #c026d3 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 14px 0 rgba(217, 70, 239, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #e879f9 0%, #d946ef 100%)',
          boxShadow: '0 6px 20px rgba(217, 70, 239, 0.4)',
        },
      },
      containedSuccess: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
          boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
        },
      },
      containedError: {
        background: 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)',
        color: '#ffffff',
        '&:hover': {
          background: 'linear-gradient(135deg, #e53935 0%, #ef5350 100%)',
        },
      },
      containedWarning: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
        },
      },
      containedInfo: {
        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
          boxShadow: '0 6px 20px rgba(6, 182, 212, 0.4)',
        },
      },
      outlinedPrimary: {
        borderWidth: '2px',
        borderColor: '#0ea5e9',
        color: '#0ea5e9',
        '&:hover': {
          borderWidth: '2px',
          borderColor: '#0284c7',
          backgroundColor: 'rgba(14, 165, 233, 0.08)',
        },
      },
      text: {
        '&:hover': {
          backgroundColor: 'rgba(14, 165, 233, 0.08)',
        },
      },
    },
    defaultProps: {
      disableElevation: false,
      disableRipple: false,
    },
  },

  // TextField Component Overrides
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '0.75rem',
          '& fieldset': {
            borderWidth: '2px',
            transition: 'all 0.3s ease',
          },
          '&:hover fieldset': {
            borderColor: '#667eea',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#667eea',
            borderWidth: '2px',
          },
          '&.Mui-error fieldset': {
            borderColor: '#ef5350',
          },
        },
        '& .MuiFilledInput-root': {
          borderRadius: '0.75rem 0.75rem 0 0',
          backgroundColor: 'rgba(102, 126, 234, 0.05)',
          '&:hover': {
            backgroundColor: 'rgba(102, 126, 234, 0.08)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
          },
        },
        '& .MuiInputLabel-root': {
          fontWeight: 500,
          '&.Mui-focused': {
            color: '#667eea',
          },
        },
      },
    },
    defaultProps: {
      variant: 'outlined',
    },
  },

  // Card Component Overrides
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '1.25rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
        },
      },
    },
  },

  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: '1.75rem',
        '&:last-child': {
          paddingBottom: '1.75rem',
        },
      },
    },
  },

  MuiCardActions: {
    styleOverrides: {
      root: {
        padding: '1.25rem 1.75rem',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        backgroundColor: 'rgba(0, 0, 0, 0.01)',
      },
    },
  },

  // Paper Component Overrides
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: '1rem',
        backgroundImage: 'none',
        border: '1px solid rgba(0, 0, 0, 0.04)',
      },
      elevation1: {
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
      },
      elevation2: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
      },
      elevation3: {
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
      },
      elevation4: {
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
      },
    },
  },

  // AppBar Component Overrides
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        color: '#0f172a',
      },
      colorPrimary: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        color: '#0f172a',
      },
    },
  },

  // Drawer Component Overrides
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
      },
    },
  },

  // Dialog Component Overrides
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: '1rem',
        padding: '0.5rem',
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },

  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.25rem',
        fontWeight: 600,
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
      },
    },
  },

  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '1.5rem',
      },
    },
  },

  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        gap: '0.75rem',
      },
    },
  },

  // Chip Component Overrides
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '0.5rem',
        fontWeight: 500,
        transition: 'all 0.2s ease',
      },
      colorPrimary: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        '&:hover': {
          backgroundColor: '#bfdbfe',
        },
      },
      colorSecondary: {
        backgroundColor: '#fce7f3',
        color: '#9f1239',
        '&:hover': {
          backgroundColor: '#fbcfe8',
        },
      },
      colorSuccess: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        '&:hover': {
          backgroundColor: '#a7f3d0',
        },
      },
      colorError: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        '&:hover': {
          backgroundColor: '#fecaca',
        },
      },
      colorWarning: {
        backgroundColor: '#fed7aa',
        color: '#92400e',
        '&:hover': {
          backgroundColor: '#fdba74',
        },
      },
      colorInfo: {
        backgroundColor: '#e0f2fe',
        color: '#075985',
        '&:hover': {
          backgroundColor: '#bae6fd',
        },
      },
      deleteIcon: {
        transition: 'all 0.2s ease',
        '&:hover': {
          color: '#ef4444',
        },
      },
    },
  },

  // Alert Component Overrides
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: '0.75rem',
        fontSize: '0.875rem',
        alignItems: 'center',
      },
      standardSuccess: {
        backgroundColor: '#f0fdf4',
        color: '#166534',
        '& .MuiAlert-icon': {
          color: '#22c55e',
        },
      },
      standardError: {
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        '& .MuiAlert-icon': {
          color: '#ef4444',
        },
      },
      standardWarning: {
        backgroundColor: '#fffbeb',
        color: '#92400e',
        '& .MuiAlert-icon': {
          color: '#f59e0b',
        },
      },
      standardInfo: {
        backgroundColor: '#eff6ff',
        color: '#1e40af',
        '& .MuiAlert-icon': {
          color: '#3b82f6',
        },
      },
      filledSuccess: {
        background: 'linear-gradient(135deg, #13c296 0%, #44e291 100%)',
      },
      filledError: {
        background: 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)',
      },
      filledWarning: {
        background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
      },
      filledInfo: {
        background: 'linear-gradient(135deg, #29b6f6 0%, #0288d1 100%)',
      },
    },
  },

  // Table Component Overrides
  MuiTable: {
    styleOverrides: {
      root: {
        borderCollapse: 'separate',
        borderSpacing: 0,
      },
    },
  },

  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: '0.75rem',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
        overflow: 'hidden',
      },
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: {
        backgroundColor: '#f9fafb',
        '& .MuiTableCell-head': {
          backgroundColor: '#f9fafb',
          fontWeight: 600,
          color: '#4b5563',
          borderBottom: '2px solid #e5e7eb',
        },
      },
    },
  },

  MuiTableBody: {
    styleOverrides: {
      root: {
        '& .MuiTableRow-root': {
          '&:hover': {
            backgroundColor: '#f9fafb',
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid #f3f4f6',
        padding: '1rem',
      },
    },
  },

  // Tabs Component Overrides
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 48,
      },
      indicator: {
        backgroundColor: '#667eea',
        height: 3,
        borderRadius: '3px 3px 0 0',
      },
    },
  },

  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        minHeight: 48,
        padding: '0.75rem 1.5rem',
        '&.Mui-selected': {
          color: '#667eea',
        },
        '&:hover': {
          backgroundColor: 'rgba(102, 126, 234, 0.08)',
        },
      },
    },
  },

  // Select Component Overrides
  MuiSelect: {
    styleOverrides: {
      root: {
        borderRadius: '0.75rem',
      },
      select: {
        padding: '0.75rem 1rem',
      },
    },
  },

  // Menu Component Overrides
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: '0.75rem',
        marginTop: '0.5rem',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        padding: '0.625rem 1rem',
        '&:hover': {
          backgroundColor: '#f3f4f6',
        },
        '&.Mui-selected': {
          backgroundColor: '#eff6ff',
          color: '#667eea',
          '&:hover': {
            backgroundColor: '#dbeafe',
          },
        },
      },
    },
  },

  // List Component Overrides
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: '0.5rem',
        margin: '0.25rem 0',
        '&:hover': {
          backgroundColor: '#f3f4f6',
        },
        '&.Mui-selected': {
          backgroundColor: '#eff6ff',
          color: '#667eea',
          '&:hover': {
            backgroundColor: '#dbeafe',
          },
        },
      },
    },
  },

  // Switch Component Overrides
  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 42,
        height: 26,
        padding: 0,
        '& .MuiSwitch-switchBase': {
          padding: 0,
          margin: 2,
          transitionDuration: '300ms',
          '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
              backgroundColor: '#667eea',
              opacity: 1,
              border: 0,
            },
          },
        },
        '& .MuiSwitch-thumb': {
          boxSizing: 'border-box',
          width: 22,
          height: 22,
        },
        '& .MuiSwitch-track': {
          borderRadius: 26 / 2,
          backgroundColor: '#e5e7eb',
          opacity: 1,
        },
      },
    },
  },

  // Checkbox Component Overrides
  MuiCheckbox: {
    styleOverrides: {
      root: {
        color: '#9ca3af',
        '&.Mui-checked': {
          color: '#667eea',
        },
        '&:hover': {
          backgroundColor: 'rgba(102, 126, 234, 0.08)',
        },
      },
    },
  },

  // Radio Component Overrides
  MuiRadio: {
    styleOverrides: {
      root: {
        color: '#9ca3af',
        '&.Mui-checked': {
          color: '#667eea',
        },
        '&:hover': {
          backgroundColor: 'rgba(102, 126, 234, 0.08)',
        },
      },
    },
  },

  // Progress Component Overrides
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e5e7eb',
      },
      bar: {
        borderRadius: 4,
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
      },
    },
  },

  MuiCircularProgress: {
    styleOverrides: {
      root: {
        color: '#667eea',
      },
    },
  },

  // Tooltip Component Overrides
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: '#1f2937',
        fontSize: '0.75rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        fontWeight: 500,
      },
      arrow: {
        color: '#1f2937',
      },
    },
  },

  // Skeleton Component Overrides
  MuiSkeleton: {
    styleOverrides: {
      root: {
        backgroundColor: '#f3f4f6',
        borderRadius: '0.5rem',
      },
      wave: {
        '&::after': {
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
        },
      },
    },
  },

  // Avatar Component Overrides
  MuiAvatar: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        backgroundColor: '#667eea',
      },
      colorDefault: {
        backgroundColor: '#9ca3af',
      },
    },
  },

  // Badge Component Overrides
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: 600,
        fontSize: '0.75rem',
        padding: '0 0.375rem',
        minWidth: '1.25rem',
        height: '1.25rem',
      },
      colorPrimary: {
        backgroundColor: '#667eea',
      },
      colorError: {
        backgroundColor: '#ef4444',
      },
      dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
      },
    },
  },

  // Stepper Component Overrides
  MuiStepper: {
    styleOverrides: {
      root: {
        padding: '1.5rem',
      },
    },
  },

  MuiStepIcon: {
    styleOverrides: {
      root: {
        color: '#e5e7eb',
        '&.Mui-active': {
          color: '#667eea',
        },
        '&.Mui-completed': {
          color: '#10b981',
        },
      },
    },
  },

  MuiStepLabel: {
    styleOverrides: {
      label: {
        fontWeight: 500,
        '&.Mui-active': {
          fontWeight: 600,
          color: '#667eea',
        },
        '&.Mui-completed': {
          fontWeight: 600,
          color: '#10b981',
        },
      },
    },
  },

  // Divider Component Overrides
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: '#e5e7eb',
      },
    },
  },

  // Accordion Component Overrides
  MuiAccordion: {
    styleOverrides: {
      root: {
        borderRadius: '0.75rem',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '0.5rem 0',
        },
      },
    },
  },

  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        padding: '1rem 1.5rem',
        minHeight: 64,
        '&.Mui-expanded': {
          borderBottom: '1px solid #e5e7eb',
        },
      },
      content: {
        fontWeight: 500,
      },
    },
  },

  MuiAccordionDetails: {
    styleOverrides: {
      root: {
        padding: '1.5rem',
      },
    },
  },

  // Breadcrumbs Component Overrides
  MuiBreadcrumbs: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
      },
      separator: {
        color: '#9ca3af',
      },
    },
  },

  // Pagination Component Overrides
  MuiPagination: {
    styleOverrides: {
      root: {
        '& .MuiPaginationItem-root': {
          borderRadius: '0.5rem',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: '#f3f4f6',
          },
          '&.Mui-selected': {
            backgroundColor: '#667eea',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#764ba2',
            },
          },
        },
      },
    },
  },

  // Rating Component Overrides
  MuiRating: {
    styleOverrides: {
      root: {
        color: '#fbbf24',
      },
      iconEmpty: {
        color: '#e5e7eb',
      },
    },
  },

  // Slider Component Overrides
  MuiSlider: {
    styleOverrides: {
      root: {
        color: '#667eea',
        '& .MuiSlider-track': {
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        },
        '& .MuiSlider-thumb': {
          backgroundColor: '#ffffff',
          border: '2px solid currentColor',
          '&:hover': {
            boxShadow: '0 0 0 8px rgba(102, 126, 234, 0.16)',
          },
        },
      },
    },
  },

  // ToggleButton Component Overrides
  MuiToggleButton: {
    styleOverrides: {
      root: {
        borderRadius: '0.5rem',
        textTransform: 'none',
        fontWeight: 500,
        border: '2px solid #e5e7eb',
        '&.Mui-selected': {
          backgroundColor: '#667eea',
          color: '#ffffff',
          borderColor: '#667eea',
          '&:hover': {
            backgroundColor: '#764ba2',
            borderColor: '#764ba2',
          },
        },
      },
    },
  },

  // Autocomplete Component Overrides
  MuiAutocomplete: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          padding: '0.5rem',
        },
      },
      paper: {
        borderRadius: '0.75rem',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      },
      option: {
        '&[aria-selected="true"]': {
          backgroundColor: '#eff6ff',
          color: '#667eea',
        },
      },
      tag: {
        borderRadius: '0.375rem',
        backgroundColor: '#eff6ff',
        color: '#667eea',
      },
    },
  },
};
