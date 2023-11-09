/**
 * Copyright (c) 2023 Quadient Group AG
 * SPDX-License-Identifier: MIT
 */

export function getDescription(): ScriptDescription {
  return {
    description: 'Script to upload Evolve documents to Digital Advantage',
    icon: 'upload',
    input: [
      {
        id: 'inputDataPath',
        displayName: 'Input data file path',
        description: 'Path to the data file to read input from (JSON format).',
        type: 'InputResource',
        required: true,
      },
      {
        id: 'documentPath',
        displayName: 'Document path',
        description: 'Path to the document to be uploaded.',
        type: 'InputResource',
        required: true,
      },
      {
        id: 'dasConnector',
        displayName: 'DAS connector',
        description:
          'The web endpoint connector configured with the URL of Digital Advantage instance to use.',
        defaultValue: '/api/query/MobileBackend/ContentUploadV4',
        type: 'Connector',
        required: true,
      },
      {
        id: 'applicationId',
        displayName: 'Application ID',
        description: 'The Digital Advantage application identifier.',
        type: 'String',
        required: true,
      },
    ],
    output: [
      {
        id: 'documentId',
        displayName: 'Document ID',
        description: 'The ID assigned to the uploaded document.',
        type: 'Number',
      },
    ],
  }
}

export async function execute(context: Context): Promise<Output> {
  const input = await readInputFile(context)
  const response = await uploadDocument(context, input.Clients[0].Reservation)
  return {
    documentId: getDocumentId(response),
  }
}

async function readInputFile(context: Context): Promise<InvoicePayload> {
  const inputData = await context
    .getFile(context.parameters.inputDataPath as string)
    .read()
  return JSON.parse(inputData)
}

async function readDocumentAsBase64(context: Context): Promise<string> {
  const documentPath = context.parameters.documentPath as string
  return await context.getFile(documentPath).readAsBase64()
}

async function uploadDocument(
  context: Context,
  data: Reservation,
): Promise<UploadResponse> {
  const body = {
    documents: [
      {
        clientAccessRights: [
          {
            clientId: data.guestClientId,
            right: 'Delete',
          },
        ],
        fileName: 'invoice.pdf',
        name: 'Invoice',
        applicationId: context.parameters.applicationId as string,
        publicAccessRight: 'None',
        metadata: [
          {
            name: 'type',
            type: 'Text',
            value: 'reward_activity',
            isReadOnly: true,
          },
          {
            name: 'hotelName',
            type: 'Text',
            value: data.hotel.name,
            isReadOnly: true,
          },
          {
            name: 'checkIn',
            type: 'Text',
            value: data.checkInDate,
            isReadOnly: true,
          },
          {
            name: 'checkOut',
            type: 'Text',
            value: data.checkOutDate,
            isReadOnly: true,
          },
          {
            name: 'guests',
            type: 'Number',
            value: data.guests,
            isReadOnly: true,
          },
          {
            name: 'points',
            type: 'Number',
            value: data.points,
            isReadOnly: true,
          },
          {
            name: 'reservationNumber',
            type: 'Number',
            value: data.confirmationNumber,
            isReadOnly: true,
          },
        ],
        fileContent: await readDocumentAsBase64(context),
      },
    ],
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  })

  const response = await fetch(context.parameters.dasConnector as string, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(
      `Non-OK DAS API response: ${response.status} ${
        response.statusText
      }:${JSON.stringify(json)}`,
    )
  }

  return JSON.parse(json)
}

function getDocumentId(response: UploadResponse): number {
  response.documents.forEach((document) => {
    if (document.documentIndex === 0) {
      return document.id
    }
  })
  throw new Error('No document ID found in upload response')
}

export interface InvoicePayload {
  Clients: Client[]
}

export interface Client {
  ClientID: string
  Reservation: Reservation
}

export interface Reservation {
  id: number
  hotel: Hotel
  confirmationNumber: number
  guests: number
  creditPrefix: number
  creditSuffix: number
  points: number
  checkInDate: string
  checkOutDate: string
  checkedIn: boolean
  guestName: string
  guestEmail: string
  guestClientId: string
}

export interface Hotel {
  id: number
  name: string
  location: string
  imageName: string
  checkInTime: string
  checkOutTime: string
  rating: number
  conciergeUrl: string
}

export interface UploadResponse {
  eventId: string
  documents: [DocumentProps]
}

export interface DocumentProps {
  documentIndex: number
  id: number
}
