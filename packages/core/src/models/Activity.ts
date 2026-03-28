export class Activity {
  private activityNode: any;

  constructor(rootNode: any) {
    this.activityNode = rootNode.PACKETTRACER5_ACTIVITY?.ACTIVITY || {};
  }

  /**
   * Cambia el título de la ventana de instrucciones
   */
  public setTitle(title: string): void {
    this.activityNode.TITLE = title;
  }

  /**
   * Cambia el contenido HTML de las instrucciones
   */
  public setInstructions(htmlContent: string): void {
    this.activityNode.INSTRUCTIONS = {
      "__cdata": htmlContent
    };
  }

  /**
   * Obtiene el porcentaje de completitud actual (del archivo cargado)
   */
  public getCompletionPercentage(): number {
    return parseInt(this.activityNode.PERCENTAGE || "0");
  }
}
