"use client"

import * as React from "react"
import { Check, Copy, Plus, Send, ShieldAlert, Trash2, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SavedContact } from "@/lib/heartwood-types"
import { middleTruncate } from "@/lib/utils"

export type AddressBookViewProps = {
  contacts: SavedContact[]
  onAddContact: (contact: Omit<SavedContact, "id">) => void
  onDeleteContact: (id: string) => void
  onSetGuardian: (id: string) => void
  onInitiateSend: (address: string) => void
}

export function AddressBookView({
  contacts,
  onAddContact,
  onDeleteContact,
  onSetGuardian,
  onInitiateSend,
}: AddressBookViewProps) {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [name, setName] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [relation, setRelation] = React.useState("Friend")
  const [isGuardian, setIsGuardian] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = (id: string, addr: string) => {
    void navigator.clipboard.writeText(addr)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !address.trim()) return
    onAddContact({
      name: name.trim(),
      address: address.trim(),
      relation: relation.trim(),
      isGuardian,
    })
    setName("")
    setAddress("")
    setIsGuardian(false)
    setShowAddForm(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Address Book
            </h1>
            <Badge variant="neutral">{contacts.length} saved</Badge>
          </div>
          <p className="text-sm text-neutral-500">
            Manage your trusted recipients and designate an Emergency Guardian for covert distress signaling.
          </p>
        </div>

        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus className="h-4 w-4" />
          Add New Contact
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 shadow-xs"
        >
          <div className="font-semibold text-sm text-neutral-950">Add Shielded Contact</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600">Contact Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alice (Sister)"
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-neutral-600">Shielded Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="utest1... or zs1..."
                className="font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isGuardian}
                onChange={(e) => setIsGuardian(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span>Designate as my Emergency Guardian (Covert SOS recipient)</span>
            </label>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Contact
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-200 overflow-hidden">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex flex-col justify-between gap-4 p-5 transition hover:bg-neutral-50/60 sm:flex-row sm:items-center"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-neutral-950">{contact.name}</span>
                <Badge variant="neutral">{contact.relation}</Badge>
                {contact.isGuardian && (
                  <Badge variant="rose" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Emergency Guardian
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-neutral-500">
                <span className="truncate">{middleTruncate(contact.address, 26, 12)}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(contact.id, contact.address)}
                  className="text-neutral-400 hover:text-neutral-950 cursor-pointer"
                  title="Copy address"
                >
                  {copiedId === contact.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {!contact.isGuardian && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSetGuardian(contact.id)}
                  title="Designate as emergency SOS recipient"
                >
                  Make Guardian
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onInitiateSend(contact.address)}
              >
                <Send className="h-3 w-3" />
                Send ZEC
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteContact(contact.id)}
                className="text-neutral-400 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
