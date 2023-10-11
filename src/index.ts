/**
 * Copyright (c) 2023 Quadient Group AG
 * SPDX-License-Identifier: MIT
 */

export function getDescription(): ScriptDescription {
  return {
    description: 'Script to upload Evolve documents to Digital Advantage',
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
  }
}

export async function execute(context: Context): Promise<void> {
  const inputJson = await readInputFile(context)
  await uploadDocument(context, inputJson)
}

async function readInputFile(context: Context): Promise<string> {
  const inputDataPath = context.parameters.inputDataPath as string
  return await context.getFile(inputDataPath).read()
}

async function readDocumentAsBase64(context: Context): Promise<string> {
  const documentPath = context.parameters.documentPath as string
  return await context.getFile(documentPath).readAsBase64()
}

async function uploadDocument(context: Context, data: string): Promise<void> {
  const jsonData = JSON.parse(data)

  const body = {
    documents: [
      {
        clientAccessRights: [
          {
            clientId: jsonData.guestClientId,
            right: 'Delete',
          },
        ],
        fileName: 'string',
        name: 'string',
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
            value: jsonData.hotelName,
            isReadOnly: true,
          },
          {
            name: 'checkIn',
            type: 'Text',
            value: jsonData.checkInDate,
            isReadOnly: true,
          },
          {
            name: 'checkOut',
            type: 'Text',
            value: jsonData.checkOutDate,
            isReadOnly: true,
          },
          {
            name: 'guests',
            type: 'Number',
            value: jsonData.guests,
            isReadOnly: true,
          },
          {
            name: 'points',
            type: 'Number',
            value: jsonData.points,
            isReadOnly: true,
          },
          {
            name: 'reservationNumber',
            type: 'Number',
            value: jsonData.reservationNumber,
            isReadOnly: true,
          },
        ],
        fileContent: readDocumentAsBase64(context),
      },
    ],
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  })

  console.log('Calling DAS API to upload document')
  const dasConnector = context.parameters.dasConnector as string
  const response = await fetch(
    `${dasConnector}/api/query/MobileBackend/ContentUploadV4`,
    {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    }
  )
  console.log(`DAS API response: ${response}`)

  const json = await response.json()
  if (!response.ok) {
    throw new Error(
      `Non-OK DAS API response: ${response.status} ${
        response.statusText
      }:${JSON.stringify(json)}`
    )
  }
}
