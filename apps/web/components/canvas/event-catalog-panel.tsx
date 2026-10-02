'use client';

import React, { useState, useMemo } from 'react';
import type {
  EventCatalogEntry,
  EventBrokerType,
  EventFrequency,
  EventCatalogRegistry,
  ObjectId,
} from '@diagramhq/domain';
import { browseEventCatalog } from '@diagramhq/domain';

export interface EventCatalogExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: EventCatalogRegistry;
  onSelectEvent?: (event: EventCatalogEntry) => void;
  onNavigateToService?: (serviceId: ObjectId) => void;
}

export const EventCatalogExplorerModal: React.FC<EventCatalogExplorerModalProps> = ({
  isOpen,
  onClose,
  registry,
  onSelectEvent,
  onNavigateToService,
}) => {
  const [search, setSearch] = useState<string>('');
  const [brokerFilter, setBrokerFilter] = useState<EventBrokerType | 'all'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<EventFrequency | 'all'>('all');
  const [producerFilter, setProducerFilter] = useState<string>('all');
  const [activeEvent, setActiveEvent] = useState<EventCatalogEntry | null>(null);

  const browseResult = useMemo(() => {
    return browseEventCatalog(registry, {
      search: search.trim() ? search : undefined,
      broker: brokerFilter === 'all' ? undefined : brokerFilter,
      frequency: frequencyFilter === 'all' ? undefined : frequencyFilter,
    });
  }, [registry, search, brokerFilter, frequencyFilter]);

  const displayedEntries = useMemo(() => {
    if (producerFilter === 'all') return browseResult.entries;
    return browseResult.entries.filter((e) => e.producerServiceName === producerFilter);
  }, [browseResult.entries, producerFilter]);

  if (!isOpen) return null;

  const producers = Array.from(new Set(registry.entries.map((e) => e.producerServiceName)));

  const getBrokerBadgeClass = (broker: EventBrokerType) => {
    switch (broker) {
      case 'kafka':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rabbitmq':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'sqs_sns':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'eventbridge':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'nats':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'redis_streams':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Event Catalog Explorer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">⚡</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Event Catalog &amp; Message Registry</h2>
              <p className="text-xs text-slate-500">
                Discoverable domain events, schemas, topics, producers, and consumers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Event Catalog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-white px-6 py-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Total Events</span>
            <span className="text-lg font-bold text-slate-900">{`${registry.totalCount} Events`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Message Topics</span>
            <span className="text-lg font-bold text-amber-600">{`${registry.topicCount} Topics`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Producers</span>
            <span className="text-lg font-bold text-indigo-600">{`${registry.producerCount} Services`}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">Consumers</span>
            <span className="text-lg font-bold text-emerald-600">{`${registry.consumerCount} Subscribed`}</span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs">
          {/* Search */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search events by name, topic, producer, or consumer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Broker filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(['all', 'kafka', 'rabbitmq', 'sqs_sns', 'eventbridge'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrokerFilter(b)}
                className={`rounded px-2.5 py-1 text-xs font-medium uppercase transition ${
                  brokerFilter === b
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Producer filter */}
          <select
            value={producerFilter}
            onChange={(e) => setProducerFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Producers</option>
            {producers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Frequency filter */}
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value as EventFrequency | 'all')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Frequencies</option>
            <option value="realtime_high">Realtime High</option>
            <option value="realtime_medium">Realtime Medium</option>
            <option value="batch_hourly">Batch Hourly</option>
            <option value="batch_daily">Batch Daily</option>
            <option value="infrequent">Infrequent</option>
          </select>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {displayedEntries.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
                <span className="text-3xl mb-2">🔍</span>
                <p className="text-sm font-medium">No domain events match your criteria</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing filters or search query.</p>
              </div>
            ) : (
              displayedEntries.map((event) => (
                <div
                  key={event.id}
                  onClick={() => {
                    setActiveEvent(event);
                    onSelectEvent?.(event);
                  }}
                  className={`flex items-start justify-between p-4 cursor-pointer transition hover:bg-slate-50 ${
                    activeEvent?.id === event.id ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${getBrokerBadgeClass(
                          event.broker
                        )}`}
                      >
                        {event.broker}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 truncate">
                        {event.name}
                      </span>
                      <span className="rounded bg-slate-100 font-mono px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">
                        {event.topic}
                      </span>
                      <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700 font-medium">
                        {`${event.schema.format} v${event.schema.version}`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 truncate">{event.description}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        📤 {event.producerServiceName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        📥 {event.consumerServiceNames.length > 0 ? event.consumerServiceNames.join(', ') : 'No consumers subscribed'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        ⏱️ {event.frequency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    {event.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Side Inspector Drawer */}
          {activeEvent && (
            <div className="w-80 border-l border-slate-200 bg-slate-50/50 p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase mb-1.5 ${getBrokerBadgeClass(
                      activeEvent.broker
                    )}`}
                  >
                    {activeEvent.broker}
                  </span>
                  <h4 className="font-mono text-sm font-bold text-slate-900 break-all">
                    {activeEvent.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveEvent(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Topic / Channel</span>
                <p className="font-mono font-medium text-slate-800 mt-0.5 bg-white p-1.5 rounded border border-slate-200 break-all">
                  {activeEvent.topic}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Description</span>
                <p className="text-slate-700 mt-0.5">{activeEvent.description}</p>
              </div>

              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Producer Service</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{activeEvent.producerServiceName}</span>
                  {onNavigateToService && (
                    <button
                      type="button"
                      onClick={() => onNavigateToService(activeEvent.producerServiceId)}
                      className="text-indigo-600 hover:underline text-[11px]"
                    >
                      Focus Node
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Subscribed Consumers ({activeEvent.consumerServiceNames.length})
                </span>
                {activeEvent.consumerServiceNames.length === 0 ? (
                  <p className="text-slate-400 italic">No consumers currently subscribed</p>
                ) : (
                  <div className="space-y-1">
                    {activeEvent.consumerServiceNames.map((name, i) => (
                      <div
                        key={name}
                        className="flex items-center justify-between font-medium text-slate-800 bg-white p-1.5 rounded border border-slate-100"
                      >
                        <span>{name}</span>
                        {onNavigateToService && activeEvent.consumerServiceIds[i] && (
                          <button
                            type="button"
                            onClick={() => onNavigateToService(activeEvent.consumerServiceIds[i]!)}
                            className="text-indigo-600 hover:underline text-[11px]"
                          >
                            Focus
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Schema Fields</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {`${activeEvent.schema.format} v${activeEvent.schema.version}`}
                  </span>
                </div>
                <div className="space-y-1">
                  {activeEvent.schema.fields.map((f) => (
                    <div
                      key={f.name}
                      className="flex justify-between font-mono text-[11px] bg-white p-1.5 rounded border border-slate-100"
                    >
                      <span className="text-slate-800 font-semibold">{f.name}</span>
                      <span className="text-slate-400">{f.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Emission Frequency:</span>
                  <span className="font-medium text-slate-800">{activeEvent.frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Delivery Guarantee:</span>
                  <span className="font-medium text-slate-800">{activeEvent.deliveryGuarantee}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
