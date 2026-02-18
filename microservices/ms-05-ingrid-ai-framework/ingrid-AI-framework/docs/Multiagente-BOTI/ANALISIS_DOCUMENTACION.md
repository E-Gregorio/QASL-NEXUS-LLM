# Análisis de Documentación: Multiagente-BOTI

## Resumen Ejecutivo
La documentación analizada describe la arquitectura y funcionamiento de la nueva plataforma conversacional **"Multiagente BOTI"** del Gobierno de la Ciudad de Buenos Aires. Esta solución reemplaza o evoluciona el chatbot actual hacia un sistema basado en **Inteligencia Artificial Generativa (GenAI)**, utilizando una arquitectura de microservicios en **Microsoft Azure** y orquestación con **LangGraph**.

El objetivo principal es pasar de menús estáticos a una conversación dinámica y natural, orquestando múltiples "Agentes Especializados" (ej. Trámites, Turismo, Accesibilidad) bajo un "Orquestador" central que mantiene la personalidad unificada de Boti.

## Arquitectura General (BAX)

La solución se despliega en un entorno **Serverless** sobre **Azure Container Apps**.

### Componentes Principales

1.  **Orquestador (Orchestrator)**
    *   **Función**: Es el cerebro del sistema. Recibe el mensaje, clasifica la intención (Triage), y decide qué agente especializado debe responder.
    *   **Responsabilidades**:
        *   Manejo del historial de conversación.
        *   **Grounding & Guardrails**: Filtra contenido inapropiado y verifica que las respuestas se basen en fuentes oficiales.
        *   **Personalidad**: Reescribe las respuestas técnicas de los agentes para que suenen como "Boti".
    *   **Tecnología**: Python, LangGraph.

2.  **Agente Base (Base Agent)**
    *   **Concepto**: Es una plantilla reutilizable para crear agentes de dominio (ej. Agente de Trámites).
    *   **Funcionamiento**: Utiliza **RAG (Retrieval-Augmented Generation)**.
        *   **Retrieve**: Busca información en **Azure AI Search** (búsqueda híbrida: vectorial + palabras clave).
        *   **Generate**: Usa **Azure OpenAI (GPT-4o/3.5)** para generar la respuesta basada *solo* en la información recuperada.
    *   **Configuración**: No tiene conocimiento "hardcodeado"; se le inyectan prompts y herramientas al ejecutarse.

3.  **Ingesta de Conocimiento**
    *   Pipeline automatizado que extrae información de **Drupal (CMS de GCBA)**.
    *   Detecta cambios (CDC), normaliza, resume con IA y actualiza los índices de **Azure AI Search**.

## Flujo de Conversación ("End-to-End")

1.  **Entrada**: Usuario envía mensaje a través de WhatsApp o Webchat.
2.  **Orquestador**:
    *   Verifica "Lista de Bloqueo".
    *   Reformula la pregunta para darle contexto.
    *   Clasifica la intención (¿Es saludo? ¿Es pregunta de trámite?).
    *   Enruta al agente correspondiente (Router).
3.  **Agente Especializado**:
    *   Busca información en su índice específico.
    *   Genera una respuesta borrador.
4.  **Orquestador (Salida)**:
    *   Aplica estilo/personalidad de Boti.
    *   Aplica validaciones finales de seguridad (Grounding).
    *   Envía respuesta al usuario.

## Integración: BA Colaborativa y PIA

El documento "BA Colaborativa" detalla cómo aplicaciones externas (como la app de colaboradores) se integran con esta plataforma de IA (PIA).
*   **IABA Broker**: Middleware que conecta las aplicaciones del GCBA con los agentes de PIA.
*   **Protocolo**: Intercambio de JSONs vía HTTP POST.
*   **Identificación**: Uso de `chatId` para mantener el contexto.

## Tecnologías Clave

| Categoría | Tecnología | Uso |
| :--- | :--- | :--- |
| **Orquestación** | **LangGraph** (Python) | Lógica de grafos, manejo de estado, agentes. |
| **Cómputo** | **Azure Container Apps** | Alojamiento de microservicios serverless. |
| **IA Generativa** | **Azure OpenAI** | Modelos LLM (GPT-4) para razonamiento y generación. |
| **Base de Conocimiento** | **Azure AI Search** | Búsqueda vectorial (RAG). |
| **Persistencia** | **Azure Cosmos DB** | Historial de chats, configuración de agentes. |
| **Observabilidad** | **Azure Application Insights** | Monitoreo, logs y trazas. |

## Conclusión
La documentación revela una arquitectura moderna y robusta, alineada con el estado del arte en aplicaciones de IA Generativa. El uso de **LangGraph** para la orquestación y **RAG** para la fidelidad de la información demuestra un enfoque en la calidad y seguridad de las respuestas, crucial para un bot gubernamental.
