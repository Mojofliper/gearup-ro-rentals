import React from 'react'
import { Badge } from '@/components/ui/badge'

interface Props {
  status: 'pending' | 'approved' | 'rejected' | null | undefined
}

export const ClaimStatusBadge: React.FC<Props> = ({ status }) => {
  if (!status) return null
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary'
  let label: string = status ?? ''
  switch (status) {
    case 'approved':
      variant = 'default'
      label = 'Claim Approved'
      break
    case 'rejected':
      variant = 'destructive'
      label = 'Claim Rejected'
      break
    case 'pending':
      variant = 'secondary'
      label = 'Claim Pending'
      break
  }
  return <Badge variant={variant}>{label}</Badge>
} 