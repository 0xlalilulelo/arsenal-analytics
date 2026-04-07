import type { ApiClient } from '../client';
import type { CommsResponse, CreateCommInput, WorkOrderComm } from '../types';

export function createCommunicationsEndpoints(client: ApiClient) {
  return {
    list(workOrderId: string) {
      return client.get<CommsResponse>(`/api/work-orders/${workOrderId}/communications`);
    },

    create(workOrderId: string, input: CreateCommInput) {
      return client
        .post<{ data: WorkOrderComm }>(`/api/work-orders/${workOrderId}/communications`, input)
        .then(r => r.data);
    },

    update(workOrderId: string, comId: string, input: Partial<CreateCommInput>) {
      return client
        .patch<{ data: WorkOrderComm }>(
          `/api/work-orders/${workOrderId}/communications/${comId}`,
          input,
        )
        .then(r => r.data);
    },

    delete(workOrderId: string, comId: string) {
      return client.delete<{ data: { deleted: boolean } }>(
        `/api/work-orders/${workOrderId}/communications/${comId}`,
      );
    },
  };
}
